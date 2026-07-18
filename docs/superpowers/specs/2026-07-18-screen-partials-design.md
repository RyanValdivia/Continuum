# Screen partials — P3 / P5 / P7 design (TDD)

Date: 2026-07-18 · Branch `feat/screen-partials`.

Completes the three partially-built demo screens. Each ships with tests first
(pure functions + services), UI/route/streaming verified by typecheck + build.

## P5 — Interview questions tied to what they measure

Today the analysis returns `interviewQuestions: string[]` and `dimensions[]`
separately; the UI can't say "this question measures X".

- **Domain** (`recruitment/domain/schemas.ts`): `interviewQuestionSchema =
  { question: string; measures: string }`. Both `analysisSchema.interviewQuestions`
  and `analysisOutputSchema.interviewQuestions` become
  `z.array(interviewQuestionSchema).min(3).max(10)`. New `InterviewQuestion` type.
- **Storage**: `analysis.interview_questions` is `jsonb` — retype its `$type` to
  `InterviewQuestion[]`. No migration (jsonb). Existing rows must be re-analyzed
  (retry-analysis already exists); demo data is fresh.
- **LLM** (`recruitment/server/llm/analyze.ts`): prompt asks each question to
  carry `measures` (the competency/dimension it probes).
- **UI** (`candidate-list.tsx`): render `q.question` with a muted `mide: {q.measures}`.
- **Tests**: schema accepts the object shape and rejects bare strings; existing
  analyze-service fixtures updated to the new shape.

## P3 — AI-autocompleted role description (JD)

"Nueva vacante → escribo un título → la IA autocompleta la descripción."

- **LLM seam** (`recruitment/server/llm/generate-role.ts`): `GenerateRoleFn =
  (input: { title: string; digest: string }) => Promise<string>` +
  `googleGenerateRole` (`generateText`, plain text). Injectable like `AnalyzeBenchmarkFn`.
- **Domain**: `generateRoleInputSchema = { title: 1..200; personId?: string }`.
- **Service** (`generate-role-description-service.ts`): `assertOrgAdmin` gate; if
  `personId`, digest that person's knowledge via
  `searchKnowledgeService(org, { query: title, personId })` (the same digest
  `analyze` uses); else empty digest. Call `GenerateRoleFn` → `{ description }`.
  Returns `AsyncAppResult<{ description: string }>`. Deps `{ generate?, embed? }`.
- **Route**: `POST /recruitment/vacancies/generate-description` (admin) →
  `{ description }`.
- **Client**: `create-vacancy-modal.tsx` gets a "✨ Generar con IA" button that
  calls the hook with the typed title and fills the (editable) description field.
- **Tests**: input schema bounds; service — admin gate (403), digest+generate
  composition with a fake `GenerateRoleFn` and mocked `searchKnowledgeService`,
  repo/LLM errors → 500.

## P7 — Clickable source citations in chat

Chat cites `[n]` against raw `doc {id}`; no clickable sources.

- **Repo** (`knowledge/server/repository/source-documents.ts`):
  `findDocumentsByIds(orgId, ids) → { id, title, url }[]` (org-scoped).
- **Pure** (`knowledge/server/chat/sources.ts`): `collectSources(chunks,
  docsById) → { title, url }[]` — distinct documents in first-cited order.
- **build-context**: `buildSystemPrompt(result, docsById?)` renders sources as
  `[i] {title}` when a title is known (legible citations); unchanged when not.
- **Chat route**: resolve distinct `documentId`s from the retrieved chunks →
  `findDocumentsByIds` → emit a `sources` data part via `createUIMessageStream`
  (`writer.write({ type: "data-sources", data })` then `writer.merge(text)`).
- **Client** (`knowledge-chat.tsx`): read `message.parts` of type
  `data-sources`; render a "Fuentes" list of clickable links under the answer.
- **Tests**: `collectSources` (distinct + order + empty); `buildSystemPrompt`
  renders titles when provided and falls back to `doc {id}` when not.

## Verification

Per feature: `pnpm vitest run <paths>`. All: `pnpm typecheck`, `pnpm test`,
`pnpm build`. No DB migration in any of the three.

## Out of scope

P6 (auto-onboarding + hire action) and the P1 seed — tracked separately.
