# Microsoft 365 Knowledge Provider — Design

Date: 2026-07-18
Status: Approved (brainstorming)

## Goal

Add Microsoft 365 as a knowledge provider for Continuum: an org admin connects a
Microsoft 365 tenant via delegated OAuth, then manually selects SharePoint/OneDrive
files and Teams channels to ingest into the knowledge graph. Ingested documents flow
through the existing `ingestDocumentService` seam (chunk + embed + LLM extraction)
and the existing document-review workflow, exactly like the Notion provider does.

## Decisions (from brainstorming)

- **Content scope**: SharePoint/OneDrive documents **and** Teams channel messages.
- **Auth model**: delegated OAuth, org-scoped, **custom OAuth flow cloned from the
  Notion integration** (approach B). better-auth's Microsoft social provider was
  considered and rejected: the org-scoped connection model with encrypted tokens in
  our own table matches the existing codebase better and keeps the connection
  independent of better-auth's per-user account lifecycle.
- **Ingestion UX**: manual selection (file picker / channel picker + ingest button),
  like Notion today. No automatic/delta sync in this iteration.
- **File formats**: plain-text formats directly (`txt/md/csv/html/json/xml`);
  Office files (`docx/pptx/xlsx`) via Graph's native `?format=pdf` conversion plus
  PDF text extraction.
- **Teams granularity**: two document levels per ingested channel — one channel
  transcript doc (`personId: null`) and one doc per active author (`personId` =
  author email), enabling person-scoped retrieval.

## Architecture

New domain `src/core/microsoft/`, mirroring the `notion/` domain layer rules:

```
src/core/microsoft/
  domain/
    schemas.ts            # zod wire schemas (single type source); never exposes tokens
    types.ts              # z.infer types
    __tests__/
  server/
    repository/           # import "server-only" + shared db; ownership by organizationId
      find-microsoft-connection.ts
      upsert-microsoft-connection.ts
      delete-microsoft-connection.ts
    services/             # AsyncAppResult<T>, GraphClient injectable for tests
      get-microsoft-connect-url-service.ts
      handle-microsoft-callback-service.ts
      get-microsoft-status-service.ts
      disconnect-microsoft-service.ts
      list-sites-service.ts
      list-drive-items-service.ts
      list-teams-service.ts
      list-channels-service.ts
      ingest-files-service.ts
      ingest-teams-channels-service.ts
    api/
      routes/             # one leaf *.route.ts per endpoint
      router.ts           # new Elysia({ prefix: "/microsoft" })
  client/
    hooks.ts              # useMicrosoft(organizationId) factory hook (Eden proxy)
    ui/
      microsoft-integration-card.tsx
      drive-item-picker.tsx
      teams-channel-picker.tsx
```

Provider plumbing in `src/server/microsoft/graph-api.ts`: plain-`fetch` Microsoft
Graph client (no SDK), same style as `src/server/notion/notion-api.ts`. Exposes an
injectable `GraphClient` interface (exchange code, refresh token, list sites/drives/
items, download content, list teams/channels/messages) so services take it as a dep
and tests inject fakes — same spirit as `IngestDeps` in the knowledge domain.

### Shared refactor (small, justified)

Move the provider-agnostic helpers out of `src/server/notion/` into
`src/server/common/` and update the Notion imports:

- `token-cipher.ts` (`encryptSecret`/`decryptSecret`, AES-256-GCM, key =
  `TOKEN_ENCRYPTION_KEY`) — moved as-is.
- `oauth-state.ts` — moved and renamed to generic `createOAuthState` /
  `verifyOAuthState` (HMAC-signed `{ organizationId, userId, ts }`, 10-min TTL).

No duplication of these utilities in the microsoft module.

### Database (one migration)

- New table `microsoft_connection`:
  - `id` uuid pk, `organizationId` text not null **unique** (one connection per org),
    `tenantId` text not null, `accessToken` text not null (encrypted),
    `refreshToken` text not null (encrypted), `tokenExpiresAt` timestamp not null,
    `connectedByUserId` text not null, `createdAt`/`updatedAt`.
- Add `"microsoft"` to the `knowledge_connector` pg enum **and** to
  `connectorSchema` in `src/core/knowledge/domain/schemas.ts`.
- Generated via `pnpm db:generate`.

### Config

- `src/config/env.ts`: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`,
  `MICROSOFT_TENANT_ID` (all optional, like the Notion vars).
- `src/config/server-config.ts`: `ServerConfig.microsoft.isConfigured`; every
  service returns 422 `err(AppErrors...)` when unconfigured (Notion pattern).
- `.env.example`: documents the vars and the redirect URI convention
  `<NEXT_PUBLIC_APP_URL>/api/v1/microsoft/callback`.

### Wire-up

- `.use(microsoftRouter)` in `src/server/router.ts`.
- `<MicrosoftIntegrationCard />` on `src/app/[slug]/app/integrations/page.tsx`.

## OAuth flow & token lifecycle

- **Connect**: `GET /microsoft/:organizationId/connect` (authed, org admin only via
  `getOrgMembership` + `ORG_ADMIN_ROLES`). Builds
  `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize` with
  `client_id`, `redirect_uri`, `response_type=code`, signed `state`, and scope:

  ```
  offline_access User.Read Sites.Read.All Team.ReadBasic.All Channel.ReadBasic.All ChannelMessage.Read.All
  ```

  (`ChannelMessage.Read.All` is the correct **delegated** scope for reading channel
  messages per the Microsoft Graph permissions reference.) → 302 redirect.

- **Callback**: `GET /microsoft/callback` — deliberately **not** authed; the signed
  state is the authorization. Verifies state, exchanges the code
  (POST form to `/{tenantId}/oauth2/v2.0/token`), encrypts both tokens, upserts the
  connection (storing `tokenExpiresAt` from `expires_in`), then redirects to
  `/{orgSlug}/app/integrations`.

- **Token lifecycle**: Entra access tokens expire in ~1 h (unlike Notion's). A
  shared `getValidAccessToken(connection)` helper:
  1. Proactively refreshes via the `refresh_token` grant when `tokenExpiresAt` is
     within 5 minutes, re-encrypting and re-persisting both tokens.
  2. On a 401 from Graph, retries once after a forced refresh (defense in depth,
     Notion pattern). If that also fails, returns 401 telling the user to reconnect.

- **Status**: `GET /microsoft/:organizationId/status` →
  `{ connected, tenantId?, connectedBy?, connectedAt? }`; tokens never cross the wire.
- **Disconnect**: `DELETE /microsoft/:organizationId/disconnect` (admin) deletes the
  row. It does not revoke the grant in Microsoft (users can revoke from their
  account); documented as such.

Expected 4xx are `err(AppErrors.x)` values, never throws: 422 unconfigured,
404 not connected, 400 invalid/expired state.

## Ingestion pipelines

### SharePoint/OneDrive files

- Browsing: `GET /sites?search=*` (SharePoint sites) plus `GET /me/drive` (the
  connecting user's OneDrive); folder children via
  `GET /drives/{driveId}/items/{folderId}/children` (lazy in the UI picker).
- Ingest: `POST /microsoft/:organizationId/ingest/files` with
  `{ items: [{ driveId, itemId }] }` (admin only). Per file:
  - Text formats (`txt/md/csv/html/json/xml`): download
    `/drive/items/{itemId}/content` directly.
  - Office (`docx/pptx/xlsx`): `GET /drive/items/{itemId}/content?format=pdf`
    (native Graph conversion), then extract text from the PDF with
    [`unpdf`](https://www.npmjs.com/package/unpdf) — the **only new dependency**,
    chosen for being lightweight and serverless-friendly (no parser exists in the
    project today).
  - Content truncated at 480k chars (ingest schema limit is 500k).
  - `externalId`: `sp:{driveId}:{itemId}` → re-sync upserts the same
    `source_documents` row. `title` = file name, `url` = `webUrl`,
    `personId` = null, `connector` = `"microsoft"`, `extract` = true.
- Per-file failures are collected into `failures: [{ externalId, reason }]` and
  never abort the batch (Notion pattern).

### Teams channel messages

- Browsing: `GET /me/joinedTeams` (delegated: only teams the connecting user
  belongs to) and `GET /teams/{teamId}/channels`.
- Ingest: `POST /microsoft/:organizationId/ingest/teams` with
  `{ channels: [{ teamId, channelId }], sinceDays }` where `sinceDays` is
  `7 | 30 | 90 | 0` (0 = everything).
- Per channel: fetch paginated top-level messages **and their replies** (the
  rationale behind decisions usually lives in replies). Message bodies are HTML;
  a small `stripHtml` helper (no dependency) converts them to plain text.
- Each message renders as a transcript line:

  ```
  Jane Doe <jane@corp.com> — 2026-07-18 14:32
  message text
  ```

- **Two documents per channel** (both levels, per decision):
  - Channel doc: full transcript, chronological.
    `externalId`: `teams:{teamId}:{channelId}:w{sinceDays}`, `personId` = null.
  - Per-user doc: only messages authored by each user with **≥ 3 messages** in the
    window (skips trivial docs). `externalId`:
    `teams:{teamId}:{channelId}:w{sinceDays}:user:{email}`, `personId` = email —
    enables person-scoped search/graph filtering.
- Both go through `ingestDocumentService` (`connector: "microsoft"`,
  `extract: true`) and the existing document-review workflow.

### Known limitation (accepted for MVP)

The LLM extractor only reads the first 30k chars of a document
(`MAX_EXTRACT_CHARS`). Short windows are unaffected; "everything" on a large
channel loses graph extraction for the tail (chunks/embeddings are still fully
indexed). Truncation of Teams content at 480k chars applies as for files.

## API surface

Leaf routes under `src/core/microsoft/server/api/routes/`, mounted on
`microsoftRouter` with prefix `/microsoft`; every response is the `CommonResponse`
envelope; authed routes carry both `.use(authed)` and `authed: true`.

| Route | Auth | Purpose |
|---|---|---|
| `GET /:organizationId/connect` | admin | 302 to Microsoft authorize |
| `GET /callback` | signed state only | exchange + upsert + redirect |
| `GET /:organizationId/status` | member | connection status |
| `DELETE /:organizationId/disconnect` | admin | delete connection |
| `GET /:organizationId/sites` | member | sites + connecting user's OneDrive |
| `GET /:organizationId/drives/:driveId/items` | member | folder children (`?folderId=`) |
| `GET /:organizationId/teams` | member | joined teams |
| `GET /:organizationId/teams/:teamId/channels` | member | channels of a team |
| `POST /:organizationId/ingest/files` | admin | ingest selected files |
| `POST /:organizationId/ingest/teams` | admin | ingest selected channels |

## UI / client

- `client/hooks.ts`: one factory hook `useMicrosoft(organizationId)` returning
  per-operation hooks via the `useElysia()` Eden proxy
  (`queryOptions`/`mutationOptions`, results read from `data.response`), plus a
  plain `getMicrosoftConnectUrl(orgId)` helper for the top-level connect
  navigation (same shape as the Notion hook).
- `MicrosoftIntegrationCard` on the integrations page: status/connect/disconnect,
  a drive-item picker (sites → drives → folders, lazy children, checkboxes) and a
  teams-channel picker (team → channels, window selector). Local state only; no
  data-table or form toolkit needed.

## Error handling

- Expected 4xx as `err()` values (see OAuth section); unexpected exceptions →
  `err(AppErrors.unexpected(cause))`.
- Ingest results include per-item `failures`; the batch always completes.
- Refresh-on-401 with a single retry; on persistent failure the caller gets a 401
  with a reconnect instruction.
- Graph throttling (429): single retry honoring the `Retry-After` header inside the
  Graph client; persistent 429 surfaces as a per-item failure.

## Testing

Vitest, tests in local `__tests__/` folders:

- `domain/`: schema parsing of route inputs; `stripHtml`; transcript rendering;
  per-user grouping with the ≥3-message threshold — pure and deterministic.
- `server/services/`: fake `GraphClient` and fake `ingestDocumentService`
  injected; cases: callback OK / invalid state / unconfigured 422; proactive
  refresh near expiry; 401 retry; ingest with partial failures; externalId scheme
  stability for re-sync upserts.
- Route smoke tests following the existing notion/knowledge test patterns.

## Verification

- `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Migration via `pnpm db:generate` (enum change + new table in one migration).
- Manual smoke in the browser at `http://localhost:3000` against a real tenant
  (requires the env vars and an Entra app registration with the scopes above).

## Out of scope (YAGNI)

- Automatic/delta sync, webhooks/subscriptions, cron.
- Outlook mail/calendar ingestion.
- Application (app-only) permissions.
- Images/OCR, native PDF upload support beyond Office conversion.
- Token revocation on disconnect.
