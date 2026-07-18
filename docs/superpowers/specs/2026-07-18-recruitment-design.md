# Continuum — Recruitment (offboarding → vacancy → CV ranking) design

Date: 2026-07-18 · Scope: new `recruitment` domain + two new knowledge node types.

## Goal

When someone leaves the company, their graph node **becomes the vacancy** for
their replacement. Continuum turns into an automated recruiting platform:
candidates apply through a public portal with their CV, each CV is compared
against the benchmark (the departed person's knowledge, or a manual role
description), and HR gets a ranked list with per-dimension gaps and generated
interview questions. Training the replacement is **out of scope** — the
existing per-person agent (`POST /api/v1/knowledge/chat` with `personId`)
already covers it.

## Decisions (locked)

| Fork | Choice |
|------|--------|
| Departure | **Logical**: knowledge is always preserved; the agent persona stays alive |
| Person | A person **is** an org member (Better Auth). Person node `id` = `member.id` |
| Offboarding | The person node **flips type** `person` → `vacancy`, same id; edges and `personId` attribution untouched |
| Vacancy benchmark | `person` (knowledge digest) **or** `manual` (role description) |
| Benchmark storage | **Computed at analysis time** via existing `searchKnowledgeService` (no snapshot table) |
| CV intake | **Public portal** per vacancy (`/apply/[token]`), candidate uploads PDF |
| CV → vacancy match | LLM comparison over the embedding-retrieved benchmark context — not raw cosine — because we need explained gaps, not just proximity |
| HR result | Ranking + per-dimension gaps + interview questions |
| Analysis trigger | Automatic on submission, in-process (no job queue, same as the rest of the project) |
| CV file retention | Not retained — store extracted `cvText` + structured `profile` + filename only |

## Graph changes (`knowledge` domain)

- `knowledge_node_type` enum gains `person` and `vacancy`
  (pg enum `ALTER TYPE ... ADD VALUE` + zod enum in
  `src/core/knowledge/domain/schemas.ts`). Migration `0005_*`.
- **Person node**: `id = member.id`, `type: person`, `origin: manual`,
  `label` = member name. Upserted by a member sync (runs when the People view
  is opened and before offboarding). Existing `personId` columns on
  `chunks` / `knowledge_nodes` / `source_documents` now resolve to real nodes
  — no data migration needed.
- **Offboarding flip**: `UPDATE knowledge_nodes SET type='vacancy'` where
  `id = memberId`; if the node doesn't exist yet, insert it directly as
  `vacancy`. The `personId` attribution everywhere keeps pointing at the same
  id, so the per-person agent and person-scoped search keep working verbatim.

## New tables (`src/server/drizzle/schemas/recruitment-schema.ts`, migration `0005_*`)

- `vacancy` — `id` text PK (**= node id**; for person-born vacancies it is the
  member id), `organizationId` FK→org cascade, `title` text,
  `benchmarkType` enum(`person`,`manual`), `manualDescription` text nullable,
  `publicToken` text unique (32 random bytes, hex), `status`
  enum(`open`,`filled`,`closed`) default `open`, timestamps.
  Index `(organizationId)`.
- `candidate` — `id` text PK, `vacancyId` FK→vacancy cascade, `name` text,
  `email` text, `cvFilename` text, `cvText` text, `profile` jsonb (LLM
  structured extraction), `status` enum(`pending`,`analyzed`,`failed`)
  default `pending`, `createdAt`. Unique `(vacancyId, email)` (dedupe),
  index `(vacancyId)`.
- `analysis` — `candidateId` text PK FK→candidate cascade, `score` real (0–100),
  `dimensions` jsonb (`[{ name, score, strengths[], gaps[] }]`),
  `summary` text, `interviewQuestions` jsonb (`string[]`), `createdAt`.

## Domain layout (`src/core/recruitment/`)

Standard layers: `domain/` (zod schemas + inferred types, incl. the LLM output
schemas for CV parse and benchmark analysis), `server/repository/` (Drizzle,
org-scoped), `server/services/` (`AsyncAppResult<T>`, admin gate via the
`assertOrgAdmin` pattern from document-review), `server/api/` (leaf routes +
`router.ts`, wired in `src/server/router.ts`), `client/` (Eden factory hook
`useRecruitment()` + shadcn UI; data-table toolkit for the ranking, TanStack
Form for forms).

## Flows

1. **Offboarding** — `/{slug}/app/people`: sync upserts org members as
   `person` nodes. Admin → "Marcar salida" (asks vacancy title) → service:
   flip/insert node as `vacancy` + insert `vacancy` row
   (`benchmarkType: person`, generates `publicToken`). Better Auth membership
   is **not** touched (access removal stays in the existing org settings).
2. **Manual vacancy** — "Nueva vacante" with title + description → new
   `vacancy` node (`origin: manual`) + `vacancy` row
   (`benchmarkType: manual`).
3. **Public application** — candidate opens `/apply/[token]` (public page
   outside the app shell), submits name + email + PDF + hidden honeypot →
   `POST /api/v1/recruitment/apply/[token]` (public route, **no** `authed` —
   explicit exception) → validate token & vacancy `open` → Gemini receives the
   PDF as file input → structured profile (zod) + plain text → insert
   `candidate` (`pending`; unique `(vacancyId, email)` rejects reapplication)
   → run analysis in-process → `analyzed` or `failed`.
4. **Analysis** — benchmark: person-based = digest via
   `searchKnowledgeService(org, { query: vacancy.title, personId, limit, hops })`
   (embeddings retrieval, nodes + chunks); manual = the description text. LLM
   (Gemini, `generateText` + `Output.object`) returns `{ score, dimensions[],
   summary, interviewQuestions[5–8] }` → upsert `analysis`.
5. **HR results** — `/{slug}/app/hiring/[id]`: copyable public link (with
   regenerate), ranked candidate table (score desc), candidate detail with
   dimensions/gaps/questions, retry-failed-analysis, delete-candidate (hard
   delete, privacy requests).

## Public surface & abuse controls (MVP)

- Opaque `publicToken` (never the vacancy id). Invalid token or non-`open`
  vacancy → identical generic 404 (no tenant leakage).
- Token regenerate + vacancy close from HR UI.
- Honeypot field, PDF size cap (5 MB), extracted-text cap, candidate cap per
  vacancy (200). Real per-IP rate limiting deferred (deploy-dependent).

## Errors

- Authed routes: `CommonResponse` envelope; expected 4xx as `err(AppErrors.x)`
  (not found, not admin, duplicate candidate, candidate cap reached).
- LLM failure (parse or analyze): candidate → `failed`, LogTape log, HR retry
  button. An application is never lost to an analysis failure.
- Unreadable PDF → 422 with a friendly portal message. Candidate cap reached →
  a friendly "no longer accepting applications" page (distinct from the
  generic 404, which is reserved for invalid/closed tokens).

## Seams for testability

- `ParseCvFn = (pdf: Uint8Array) => Promise<CandidateProfile>` and
  `AnalyzeBenchmarkFn = (input: { benchmark, profile }) => Promise<AnalysisOutput>`
  — injectable types like `ExtractFn`; tests use deterministic fakes, prod
  binds Gemini. Repositories `vi.mock`ed.
- Offboarding test: flip preserves edges + `personId` attribution; chat with
  that `personId` still grounds after the flip.
- Public route tests: token validation, dedupe, caps.

## Out of scope (later)

Per-IP rate limiting · ATS/email ingestion · retaining the original PDF ·
snapshot/editable benchmark criteria · cosine-similarity signal in the score ·
Better Auth membership removal on offboarding · rehire flow (flipping a
`vacancy` node back to `person`) · candidate-facing status page.

## Internal phases (single spec)

1. People & offboarding: node types + migration, member→node sync, People
   view, flip action + vacancy row.
2. Vacancies & portal: vacancy CRUD (incl. manual), `/apply/[token]` page +
   public submit route, Gemini CV extraction.
3. Analysis & ranking: analysis service, ranking UI, candidate detail, retry,
   delete.
