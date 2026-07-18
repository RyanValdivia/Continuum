# Continuum — Knowledge Graph + Embeddings (design & integration contract)

Date: 2026-07-18 · Branch: `worktree-knowledge-graph` · Scope: the `knowledge` domain only.

## Goal

The core of Continuum: an org-owned **knowledge graph** with **vector embeddings**
and **hybrid retrieval**. Source-agnostic — a connector (the teammate's Notion sync)
hands over document text; this domain does chunking, embedding, graph extraction,
storage, and search. No Notion code lives here.

## Decisions (locked)

| Fork | Choice |
|------|--------|
| Target | MVP/pilot (weeks) — real data, lean |
| Store | Postgres + **pgvector**, node/edge tables, Drizzle. One datastore. |
| Ownership | **`organizationId`** (Better Auth org plugin) + nullable `personId` attribution |
| LLM | **Gemini** via **Vercel AI SDK** (`@ai-sdk/google`), pure TypeScript |
| Embeddings | `gemini-embedding-001` @ **768 dims** (Matryoshka `outputDimensionality`), L2-normalized, HNSW cosine |
| Extraction | `gemini-2.5-flash` via `generateText` + `Output.object` (zod-typed) |

`personId` is a plain column, **not** an FK — the `person` table lands in a later
domain; attribution must never block ingestion. A departed person's knowledge
outlives their login.

## Schema (`src/server/drizzle/schemas/knowledge-schema.ts`)

- `source_documents` — one ingested source; unique `(org, connector, externalId)` → upsert on re-sync.
- `chunks` — text + `vector(768)` embedding; HNSW cosine index. Vector retrieval runs here.
- `knowledge_nodes` — decision | process | concept | document; `personId` attribution; optional embedding.
- `knowledge_edges` — typed directed edges; unique `(from, to, type)`.

Migration `drizzle/0002_knowledge_graph.sql` — **prepends `CREATE EXTENSION IF NOT EXISTS vector`**
(drizzle-kit omits it).

## The seam a connector calls

```ts
import { ingestDocumentService } from "@/core/knowledge/server/services/ingest-document-service";

await ingestDocumentService(organizationId, {
    connector: "notion",
    externalId: notionPageId,   // stable id → re-sync updates in place
    title, content,             // plain text; service chunks + embeds
    url?, personId?,            // attribution
    extract: true,              // run LLM graph extraction
});
```

Or over HTTP (org resolved from the session's active org):

- `POST /api/v1/knowledge/ingest` — ingest a document.
- `POST /api/v1/knowledge/search` — hybrid retrieval `{ query, personId?, limit?, hops? }`.
- `GET  /api/v1/knowledge/graph`  — a bounded graph slice for visualization.

## Flow

**Ingest:** upsert doc (sha256 content hash) → `chunkText` → embed (`RETRIEVAL_DOCUMENT`)
→ replace chunks → if `extract`: LLM → embed node labels → insert nodes → map tempId→uuid,
drop dangling/self edges → insert edges.

**Search (hybrid):** embed query (`RETRIEVAL_QUERY`) → cosine top-K chunks + nodes
(org/person scoped) → expand matched nodes `hops` deep (BFS) → chunks are citations,
nodes+edges are structured context. Expansion-only nodes carry a null score.

## Seams for testability

`EmbedFn` and `ExtractFn` are injectable types (`deps` on the services); tests pass
deterministic fakes — no network, no model. Repositories are `vi.mock`ed.

## Out of scope (later sub-projects)

Notion connector · `person` table + per-person agent · interview agent · chat/streaming
UI (AI Elements) · job queue (sync is in-process) · node dedup/merge (naive today).

## Verification (2026-07-18)

- `pnpm test` → 54 passing (18 new: chunk 7, schema 6, services 5).
- `pnpm typecheck` → clean.
- `pnpm check` (biome) → clean on all knowledge-domain files. (2 unrelated
  pre-existing format/import errors remain on `origin/main`: `providers.tsx`,
  `organization/[path]/page.tsx` — not touched here.)
- `pnpm build` not run — needs real `.env` secrets (DB, Gemini key) unavailable in this session.

## Runtime prerequisites (before `pnpm db:migrate`)

- Postgres with the `vector` extension available (Supabase has it).
- `GOOGLE_GENERATIVE_AI_API_KEY` in `.env` (see `.env.example`).
