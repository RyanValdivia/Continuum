# Admin document review — design spec

Date: 2026-07-18
Status: Ready for implementation
Author: design agent (mirrors the `project` reference domain)

## 1. Goal & audience

Give an organization's **owners and admins** a data-table — built exactly like the
reference `projects` table — for **reviewing the documents already ingested into
the knowledge base** (`source_documents`). Admins can:

- **List** every ingested document in their active org, paginated.
- **Filter** by review status and connector, **search** by title, **sort**.
- **Inspect** one document (title, connector, attribution, timestamps).
- **Set a review status** — `pending` / `approved` / `rejected` / `flagged` — with
  an optional reviewer note, via a row/toolbar action.

Regular members never see this screen: it is an **owner/admin-only** surface,
org-scoped. It is a review workflow *on top of* the existing `knowledge` domain;
it does not ingest, edit content, or delete documents.

This domain follows every `Project`-domain convention verbatim: **zod is the single
type source (types are `z.infer`, never re-exported)**; **one Eden factory hook per
domain**; the **data-table toolkit** (`useDataTable` + streamed RSC) and **TanStack
Form** (`useAppForm` + `Field`). See `docs/code-review/{README,types-schemas,frontend-data-fetching,tables-and-forms}.md`.

## 2. Data model — decision

**Chosen: (a) extend `source_documents` in place.** One review state per document,
no history. For an MVP this is the right call:

- The review status is a 1:1 attribute of the document — a document has exactly one
  current status. A separate `document_reviews` table only earns its keep once we
  need an **audit trail / multiple reviewers over time**, which is out of scope.
- The faceted status filter and the list query become a single column predicate and
  index — no join, no "latest review per document" sub-query.
- It reuses `source_documents`' existing org scoping (`organization_id`),
  attribution (`person_id`), and `updated_at` (`$onUpdate`).

Migration path if history is later required: add `document_reviews` (append-only,
`document_id` FK, `reviewed_by`, `status`, `note`, `created_at`) and keep the
`source_documents.review_status` column as the denormalized "current" pointer.

### Drizzle sketch — add to `src/server/drizzle/schemas/knowledge-schema.ts`

```ts
// New pg enum, alongside the existing knowledge enums.
export const documentReviewStatus = pgEnum("document_review_status", [
    "pending",
    "approved",
    "rejected",
    "flagged",
]);

// New columns on the existing sourceDocuments table:
reviewStatus: documentReviewStatus("review_status")
    .default("pending")
    .notNull(),
reviewedBy: text("reviewed_by").references(() => user.id, {
    onDelete: "set null",
}), // nullable; set to null if the reviewer's user row is deleted
reviewedAt: timestamp("reviewed_at"),       // nullable — null until first reviewed
reviewNote: text("review_note"),            // nullable — optional reviewer note

// New composite index in the table's index list, backing the faceted list query:
index("source_documents_org_review_status_idx").on(
    table.organizationId,
    table.reviewStatus,
),
```

`user` is already importable from `./auth-schema` (as `project-schema` does). One
Drizzle migration is generated for the enum + 4 columns + index.

**Re-sync interaction (important).** `upsertSourceDocument`
(`src/core/knowledge/server/repository/source-documents.ts`) upserts on re-sync and
its `onConflictDoUpdate({ set })` currently touches only `title`/`url`/`contentHash`/
`lastSeenAt`/`updatedAt`. **Leave the review columns out of that `set`** so a re-sync
never clobbers an existing decision (an `approved` doc stays approved). Optional
follow-up (note, don't build for MVP): when `contentChanged`, reset `reviewStatus`
to `pending` so materially changed docs return to the review queue.

## 3. New domain: `src/core/document-review/`

A standalone domain that mirrors `src/core/project/` file-for-file. It **reads the
`sourceDocuments` Drizzle table** (a cross-domain *table* read in the repository is
fine — it does not import or re-export any `knowledge` *type*; this domain owns its
own wire schema). Router prefix `/document-reviews`; the Eden client accesses it as
`useElysia()["document-reviews"]` (bracket access, hyphenated key).

### 3.1 `domain/` — zod schemas + inferred types + search-params

`domain/schemas.ts`
- `reviewStatusSchema = z.enum(["pending","approved","rejected","flagged"])`.
- `reviewActionStatusSchema = z.enum(["approved","rejected","flagged"])` — the
  statuses a reviewer can *set* from the UI (you don't "action" a doc back to
  `pending`; that's the default).
- `documentReviewSchema` — the wire shape (Date → ISO string at the repo boundary),
  mirroring `projectSchema`:
  ```
  id, organizationId, personId (nullable), connector (connectorSchema shape),
  title, url (nullable), reviewStatus, reviewedBy (nullable), reviewedAt (nullable
  string), reviewNote (nullable), createdAt (string), updatedAt (string)
  ```
  Define a **local** `connectorSchema = z.enum(["notion","manual"])` here (mirrors
  the Drizzle enum) rather than importing knowledge's — keep the type home in this
  domain, per "never re-export types."
- `reviewDocumentSchema` — the review-action body: `{ reviewStatus: reviewActionStatusSchema, note: z.string().trim().max(2000).optional() }`.
- `DOCUMENT_REVIEW_SORTABLE_COLUMNS = ["title","reviewStatus","createdAt","updatedAt"] as const` + `documentReviewSortItemSchema` (`z.object({ id: z.enum(...), desc: z.boolean() })`).
- `documentReviewSearchSchema` — copy `projectSearchSchema`'s `page`/`perPage`/`sort`
  (reuse the same `parseSortParam` preprocess) plus the facets/search:
  ```
  page, perPage, sort,
  reviewStatus: preprocess(→array) z.array(reviewStatusSchema).catch([]),
  connector:    preprocess(→array) z.array(connectorSchema).catch([]),
  title:        z.string().trim().default(""),
  ```
- `paginatedDocumentReviewsSchema` — `{ items: array(documentReviewSchema), total, page, perPage, pageCount }` (identical shape to `paginatedProjectsSchema`).

`domain/types.ts` — `z.infer` each: `ReviewStatus`, `ReviewActionStatus`, `Connector`,
`DocumentReview`, `ReviewDocument`, `DocumentReviewSort`, `DocumentReviewSearch`,
`PaginatedDocumentReviews`. Nothing re-exported.

`domain/search-params.ts` — nuqs parsers + `createSearchParamsCache`, keys **matching
what `useDataTable` writes**: `page`, `perPage`, `sort` (default `[{ id:"createdAt", desc:true }]`),
`reviewStatus` (`parseAsArrayOf(parseAsString).withDefault([])`), `connector` (same),
`title` (`parseAsString.withDefault("")`).

`domain/__tests__/schemas.test.ts` — mirror the project schema test (defaults,
`.catch([])` degradation, sort-param parsing).

### 3.2 `server/repository/` — Drizzle, org-scoped

- `utils.ts` — `toDocumentReview(row: SourceDocumentRow): DocumentReview` mapper
  (Date → ISO string; passes `reviewStatus`/`reviewedBy`/`reviewedAt`/`reviewNote`).
- `find-documents-page.ts` — `findDocumentsPage(organizationId, params): { rows, total }`.
  `where = and(eq(sourceDocuments.organizationId, organizationId), reviewStatus.length ? inArray(...) : undefined, connector.length ? inArray(...) : undefined, title ? ilike(sourceDocuments.title, \`%${title}%\`) : undefined)`.
  `SORT_COLUMNS` whitelist maps the 4 sortable ids to columns; `orderBy` defaults to
  `desc(createdAt)`. Rows **and** count share the same `where`. Same structure as
  `find-projects-page.ts`, scoped by `organizationId` instead of `userId`.
- `find-document-by-id.ts` — `findDocumentById(id, organizationId): SourceDocumentRow | null`
  (`where id AND organizationId`).
- `set-document-review.ts` — `setDocumentReview(id, organizationId, { reviewStatus, note, reviewedBy }): SourceDocumentRow | null`.
  `db.update(sourceDocuments).set({ reviewStatus, reviewNote: note ?? null, reviewedBy, reviewedAt: new Date() }).where(and(eq(id), eq(organizationId))).returning()`.
- `find-member-role.ts` — `findMemberRole(organizationId, userId): string | null`,
  selecting `member.role` where `member.organizationId AND member.userId` (mirrors
  the join in `src/server/auth/require-organization.ts`). Backs the admin guard.

### 3.3 `server/services/` — `AsyncAppResult<T>`, admin-scoped

All three services take `(userId, organizationId, …)` and **first enforce admin**,
then org-scope. Shared guard:

- `require-org-admin.ts` — `assertOrgAdmin(userId, organizationId): AsyncAppResult<void>`
  → `findMemberRole`; `ok()` iff role ∈ `{"owner","admin"}`, else `err(AppErrors.forbidden())`.
  (DB-backed, so it lives at the service layer, not the route.)

- `search-documents-service.ts(userId, organizationId, params): AsyncAppResult<PaginatedDocumentReviews>`
  — `assertOrgAdmin` → `findDocumentsPage` → `ok({ items: rows.map(toDocumentReview), total, page, perPage, pageCount })`. Same body as `searchProjectsService`, plus the admin gate; wrap in try/catch → `err(AppErrors.unexpected(cause))`.
- `get-document-service.ts(userId, organizationId, id): AsyncAppResult<DocumentReview>`
  — admin gate → `findDocumentById`; `null → err(AppErrors.notFound({ targets:["id"] }))`.
- `review-document-service.ts(userId, organizationId, id, input: ReviewDocument): AsyncAppResult<DocumentReview>`
  — admin gate → `setDocumentReview(id, organizationId, { ...input, reviewedBy: userId })`; `null → notFound`; else `ok(toDocumentReview(row))`.
- `__tests__/document-review-services.test.ts` — mirror `project-services.test.ts`:
  cover the admin-forbidden path, org-scoping, not-found, and a happy review.

### 3.4 `server/api/` — Elysia leaf routes + domain router

Each route is `new Elysia().use(authed)` with `authed: true`, resolves the active org
from `session`, then delegates. Reuse the **shared** active-org guard — promote
`requireActiveOrg` to `src/server/auth/require-active-org.ts` and import it from both
this domain and `knowledge` (it is generic; currently it lives in
`src/core/knowledge/server/api/require-active-org.ts`). If we prefer not to touch
`knowledge`, duplicate a local `require-active-org.ts` — but promoting is cleaner.

- `routes/list-documents.route.ts` — `GET "/"`, `query: documentReviewSearchSchema`.
  `const org = requireActiveOrg(session); if (!org.ok) return status(403, errorToResponse(org.error));`
  then `searchDocumentsService(user.id, org.data, query)`. `response: { 200: successResponseSchema(paginatedDocumentReviewsSchema, "PaginatedDocumentReviews"), 403, 500 }`. `detail.tags: ["Document Reviews"]`.
- `routes/get-document.route.ts` — `GET "/:id"`, `params: z.object({ id: z.string() })` →
  `getDocumentService(user.id, org.data, params.id)`. `response: { 200, 403, 404, 500 }`.
- `routes/review-document.route.ts` — `PATCH "/:id/review"`, `params id`,
  `body: reviewDocumentSchema` → `reviewDocumentService(user.id, org.data, params.id, body)`.
  `response: { 200: successResponseSchema(documentReviewSchema, "DocumentReview"), 400, 403, 404, 500 }`.
- `router.ts` — `export const documentReviewRouter = new Elysia({ prefix: "/document-reviews" }).use(listDocumentsRoute).use(getDocumentRoute).use(reviewDocumentRoute);`

All responses use the `CommonResponse` envelope; expected 4xx are `err(AppErrors.x)`
values mapped via `errorToResponse`, never thrown.

### 3.5 `client/` — one Eden factory hook + data-table toolkit + TanStack Form

- `client/validation.ts` — `reviewFormSchema = z.object({ reviewStatus: reviewActionStatusSchema, note: z.string().max(2000) })` + `ReviewFormValues` (`z.infer`). Reuses `reviewActionStatusSchema` from `domain/schemas`.
- `client/hooks.ts` — **one factory** `useDocumentReviews()` binding
  `useElysia()["document-reviews"]` and `useRouter()` once. The list is RSC-driven, so
  the only sub-hook is the review mutation (per-row id at call-site):
  ```
  const useReview = (id: string) =>
      useMutation(client({ id }).review.patch.mutationOptions({
          onSuccess: () => router.refresh(),   // re-runs server.tsx against current URL
      }));
  return { useReview };
  ```
  No loose top-level hooks; no re-exported types.
- `client/ui/forms/review-form.tsx` — `useAppForm({ defaultValues, validators: { onChange: reviewFormSchema }, onSubmit })`; a **status `<select>`** (`approved`/`rejected`/`flagged`) and a **note `<Textarea>`**, each wrapped in `Field`/`FieldError` via the `getFieldErrors` mapper. Exports the `ReviewForm` component + `ReviewFormApiType` (from a `_reviewForm()` returning-type helper), exactly like `project-form.tsx`.
- `client/ui/modals/review-document-modal.tsx` — `<Dialog>` + `<ReviewForm>` + `useReview(document.id)`; seeds `defaultValues.reviewStatus` from the row action's intended status, note `""`. On submit maps empty note → `undefined`, calls the mutation, toasts, closes. `{ open, onOpenChange, document, defaultStatus }`; conditionally rendered by the table so it remounts per row (fresh `defaultValues`).
- `client/ui/table/columns.tsx` — default-export `getDocumentReviewTableColumns({ setRowAction })` (§4).
- `client/ui/table/action-bar.tsx` — `DocumentReviewTableActionBar({ table })`; CSV export of selected rows via `exportTableToCSV` (filename `document-reviews`, exclude `select`/`actions`), matching `project`'s action bar.
- `client/ui/table/data-table.tsx` — `"use client"` `DocumentReviewsTable({ promises })`;
  `React.use(promises)` for `{ items, pageCount }`, `useDataTable({ data, columns, pageCount, getRowId: r=>r.id, shallow:false, clearOnDefault:true, initialState:{ sorting:[{id:"createdAt",desc:true}], columnPinning:{ right:["actions"] } } })`; renders `<DataTable actionBar>` + `<DataTableToolbar><DataTableSortList/></DataTableToolbar>` and the review modal conditionally on `rowAction`.
- `client/ui/table/server.tsx` — RSC `DocumentReviewsTableServer({ options, organizationId })`; `requireAuth()` then hands the client `Promise.all([resolveResult(searchDocumentsService(user.id, organizationId, options))])` **unawaited**.

**Row-action type.** The shared `DataTableRowAction<TData>` variant union is fixed to
`"update" | "delete"` (`src/frontend/types/data-table.ts`). Do **not** widen it —
define a domain-local `DocumentReviewRowAction = { row: Row<DocumentReview>; variant: "review"; status: ReviewActionStatus }` and drive the modal from it.

### 3.6 App route — `src/app/[slug]/app/documents/`

- `page.tsx` — RSC. `requireAuth()` → `requireOrganization(slug, user.id)` (returns
  `{ organization, role }`); **if `role` ∉ `{"owner","admin"}` → `notFound()`** (UI
  gate; the service is the authoritative gate). Parse the URL through
  `documentReviewsSearchParamsCache.parse` → `documentReviewSearchSchema.parse` →
  `options`. Render `<Suspense fallback={<DataTableSkeleton columnCount={6} filterCount={2}/>}><DocumentReviewsTableServer options={options} organizationId={organization.id} /></Suspense>`.
- `error.tsx` — sibling boundary (copy `projects/error.tsx`) catching the
  `AppErrorException` re-thrown by `resolveResult`.

Add a nav entry to this screen in the `[slug]/app` header/switcher area (owner/admin
only) — optional, follow existing nav conventions.

## 4. Data-table specifics

Columns (`ColumnDef<DocumentReview>[]`), left→right:

| id | header | cell | sort | filter (`meta.variant`) |
|----|--------|------|------|--------------------------|
| `select` | checkbox | row checkbox | no | — |
| `title` | Title | truncated title | **yes** | **text** (`Search by title…`, `TextIcon`) — the search box lives here, not a page-level `q` |
| `connector` | Source | `<Badge variant="outline">` (`notion`/`manual`) | no | **select** (`TagIcon`, options Notion/Manual) — faceted |
| `personId` | Attributed to | person id or `—` (`DescriptionCell`) — later resolves to a name when the `person` domain lands | no | no |
| `reviewStatus` | Review | status **badge** (color per status) | **yes** | **select** (options Pending/Approved/Rejected/Flagged) — faceted |
| `createdAt` | Ingested | `formatDate(...)`, muted | **yes** | no |
| `actions` | — | dropdown → **Approve / Reject / Flag**, each `setRowAction({ row, variant:"review", status })` | no | — |

- Sort exposed via `DataTableSortList` in the toolbar (plain `<div>` headers, no
  header-click sorting), whitelisted to `DOCUMENT_REVIEW_SORTABLE_COLUMNS`.
- Faceted filters (`reviewStatus`, `connector`) + the `title` text filter live in
  `DataTableToolbar`; `useDataTable` wires a `?reviewStatus=` / `?connector=` /
  `?title=` URL parser per filterable column — keys match `search-params.ts`.
- Toolbar review actions: the row dropdown's Approve/Reject/Flag open the single
  `ReviewDocumentModal` pre-seeded with that status; the modal always lets the admin
  add/edit the note before confirming. Bulk actions in `action-bar.tsx` = CSV export
  for MVP (a bulk-approve is a clean follow-up, not MVP).

## 5. Authorization

- **Who:** org **owner or admin** only (better-auth organization plugin roles in the
  `member` table: `owner` / `admin` / `member`).
- **Where enforced (authoritative):** the **service layer** — every service calls
  `assertOrgAdmin(userId, organizationId)` before any read/write and returns
  `err(AppErrors.forbidden())` (403) for non-admins. This is the single source of
  truth; the API route only resolves the active org (403 if none) and the RSC page
  only gates *UI visibility*.
- **Org scoping:** every repository query filters by `organizationId` (the caller's
  **active** organization, from `session.activeOrganizationId` via `requireActiveOrg`)
  in both the rows query and the count query. A member of org A can never see or
  review org B's documents; a non-admin member of the active org is 403'd.
- Routes carry both `.use(authed)` and `authed: true`; unauthenticated → 401.

## 6. Wire step

Add to `src/server/router.ts`: import `documentReviewRouter` and append
`.use(documentReviewRouter)` to the `app` chain (next to `.use(projectRouter).use(knowledgeRouter)`).
The router is not live until this line exists.

## 7. Task breakdown (ordered)

1. **Schema + migration.** Add `documentReviewStatus` pg enum, the 4 review columns,
   and the `(organization_id, review_status)` index to `source_documents` in
   `knowledge-schema.ts`; generate + run the Drizzle migration. Update
   `upsertSourceDocument`'s conflict `set` to **exclude** the review columns.
2. **`domain/`** — `schemas.ts` (status/connector/wire/action/search/paginated +
   sortable columns), `types.ts` (`z.infer` only), `search-params.ts`; add
   `__tests__/schemas.test.ts`.
3. **Shared guards** — promote `requireActiveOrg` to `src/server/auth/require-active-org.ts`
   (re-point `knowledge`); add repository `find-member-role.ts` and service
   `require-org-admin.ts` (`assertOrgAdmin`).
4. **`server/repository/`** — `utils.ts` (`toDocumentReview`), `find-documents-page.ts`,
   `find-document-by-id.ts`, `set-document-review.ts`.
5. **`server/services/`** — `search-documents-service.ts`, `get-document-service.ts`,
   `review-document-service.ts`; add `__tests__/document-review-services.test.ts`
   (admin-forbidden, org-scope, not-found, happy review).
6. **`server/api/`** — `list-documents.route.ts`, `get-document.route.ts`,
   `review-document.route.ts`, `router.ts`.
7. **Wire** — `.use(documentReviewRouter)` in `src/server/router.ts`; verify the
   OpenAPI/Scalar surface in dev.
8. **`client/`** — `validation.ts`, `hooks.ts` (factory `useDocumentReviews` →
   `useReview`), `ui/forms/review-form.tsx`, `ui/modals/review-document-modal.tsx`.
9. **`client/ui/table/`** — `columns.tsx`, `action-bar.tsx`, `data-table.tsx`,
   `server.tsx` (+ the local `DocumentReviewRowAction` type).
10. **App route** — `src/app/[slug]/app/documents/{page.tsx,error.tsx}` (admin gate +
    `<Suspense>` + skeleton); add the owner/admin-only nav entry.
11. **Verify** — typecheck/lint/tests green; manual pass: non-admin gets 403 + no nav;
    admin can filter by status/connector, search by title, sort, and approve/reject/
    flag with a note; re-sync of an ingested doc preserves its review status.

## 8. Convention checklist (must hold)

- Zod is the single type source; all types are `z.infer` / `(typeof CONST)[number]`;
  **no type is re-exported** and no `knowledge` type is imported (own `connectorSchema`).
- One Eden factory hook per domain (`useDocumentReviews`); sub-hooks use
  `client(...).<op>.mutationOptions({ onSuccess })`; consumers read `data.response`.
- Table = `useDataTable` + `pageCount` + streamed RSC (`server.tsx` passes an
  unawaited `Promise.all`, client reads with `React.use`); no hand-rolled
  `useReactTable` / client-side filtering; `search-params.ts` keys match URL writes.
- Form = `useAppForm` + zod validator (in `validation.ts`) + `Field`/`FieldError`;
  the review dialog lives in `ui/modals/`, the form in `ui/forms/`, and remounts per
  row action.
- Every route: `CommonResponse` envelope, `.use(authed)` + `authed: true`, expected
  4xx as `err(AppErrors.x)`; admin + org enforced in the service, org-scoped in every
  repository WHERE.
