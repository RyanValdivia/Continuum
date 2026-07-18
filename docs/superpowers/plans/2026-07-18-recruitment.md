# Recruitment (offboarding → vacancy → CV ranking) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a departing person's graph node into a vacancy, accept CVs through a public portal, and rank candidates against the departed person's knowledge (or a manual role description) with per-dimension gaps and interview questions.

**Architecture:** New `src/core/recruitment/` domain (domain/repository/services/api/client per project conventions). Two new knowledge node types (`person`, `vacancy`); offboarding flips a member's node `person` → `vacancy` in place (same id = `member.id`), preserving all `personId` attribution. LLM seams (`ParseCvFn`, `AnalyzeBenchmarkFn`) are injectable like knowledge's `ExtractFn`; prod binds Gemini, tests use deterministic fakes.

**Tech Stack:** Next 16 RSC · Elysia (`/api/v1`) · Drizzle + Postgres/pgvector · zod (single type source) · Vercel AI SDK + `@ai-sdk/google` · Eden/TanStack-Query hooks · shadcn/ui + Tailwind v4 · Vitest.

**Spec:** `docs/superpowers/specs/2026-07-18-recruitment-design.md` (committed on this branch).

## Global Constraints

- zod is the single type source; every `type` is `z.infer<...>`; **never re-export types** across modules.
- Every authed route: `.use(authed)` **and** `authed: true`, `CommonResponse` envelope, expected 4xx as `err(AppErrors.x)` values — never throws. `requireActiveOrg(session)` scopes the org.
- **Exception:** `POST /api/v1/recruitment/apply/:token` is public (no `authed`), like the Notion OAuth callback. Its body uses Elysia `t.Object`/`t.File()` — **not zod** — because the global OpenAPI `mapJsonSchema: { zod: z.toJSONSchema }` throws on `z.instanceof(File)` at boot. Service-level input is still zod-validated inside the service.
- Repositories: `import "server-only"`, shared `db` from `@/server/drizzle/db`, org-scoped WHEREs, row→wire mappers (`toXxx`) converting `Date` → `toISOString()`.
- Services return `AsyncAppResult<T>`, wrap DB/LLM calls in try/catch → `err(AppErrors.unexpected(cause))`, and gate admin operations with `assertOrgAdmin` (new shared module from Task 4).
- Tests in `__tests__/` next to the code; repositories are `vi.mock`ed; LLM/embed seams are injected fakes (pattern: `knowledge-services.test.ts`).
- Biome: 4-space indent, no `any`/`as any`/`@ts-ignore`. Files under 500 lines.
- Gemini model id is `gemini-2.5-flash` everywhere; embeddings stay 768-dim (untouched).
- Do NOT modify document-review's own `require-org-admin.ts` — the new shared one lives in `src/server/auth/`.
- Public token = 64 hex chars (`node:crypto` `randomBytes(32)`), unique per vacancy, regenerable.
- The stale comment on `knowledgeNodes` ("A person is NOT a node type") must be updated in Task 1 — persons and vacancies are node types now.

---

### Task 1: `person` + `vacancy` knowledge node types

**Files:**
- Modify: `src/core/knowledge/domain/schemas.ts:5-11` (`nodeTypeSchema`)
- Modify: `src/core/knowledge/domain/__tests__/schemas.test.ts` (add enum coverage)
- Modify: `src/server/drizzle/schemas/knowledge-schema.ts:29-34` (pg enum) and `:145-149` (stale comment)
- Create: `drizzle/0005_*.sql` (generated)

**Interfaces:**
- Produces: `nodeTypeSchema` now allows `"person" | "vacancy"`; `NodeType` (in `src/core/knowledge/domain/types.ts`, inferred) widens automatically — no other file changes needed there.

- [ ] **Step 1: Write the failing test**

In `src/core/knowledge/domain/__tests__/schemas.test.ts`, add inside the existing `nodeTypeSchema` describe (or a new one if absent):

```ts
it("accepts person and vacancy node types", () => {
    expect(nodeTypeSchema.parse("person")).toBe("person");
    expect(nodeTypeSchema.parse("vacancy")).toBe("vacancy");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/core/knowledge/domain/__tests__/schemas.test.ts`
Expected: FAIL — `"person"`/`"vacancy"` rejected by the enum.

- [ ] **Step 3: Widen the zod enum and the pg enum, fix the stale comment**

`src/core/knowledge/domain/schemas.ts`:

```ts
export const nodeTypeSchema = z.enum([
    "decision",
    "process",
    "concept",
    "document",
    "person",
    "vacancy",
]);
```

`src/server/drizzle/schemas/knowledge-schema.ts`:

```ts
export const knowledgeNodeType = pgEnum("knowledge_node_type", [
    "decision",
    "process",
    "concept",
    "document",
    "person",
    "vacancy",
]);
```

Replace the stale docblock above `knowledgeNodes` with:

```ts
/**
 * A knowledge-graph node: a decision, process, concept, or document distilled
 * from the source — or a structural node: `person` (an org member; id =
 * member.id) and `vacancy` (an open role; a departed person's node flips to
 * this type in place, keeping every `personId` attribution).
 */
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/core/knowledge/domain/__tests__/schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Generate the migration and verify the SQL**

Run: `pnpm db:generate`
Expected: new `drizzle/0005_<name>.sql` containing:

```sql
ALTER TYPE "public"."knowledge_node_type" ADD VALUE 'person';
ALTER TYPE "public"."knowledge_node_type" ADD VALUE 'vacancy';
```

(If drizzle-kit emits a different shape for enum alteration, keep its output — but it MUST contain both `ADD VALUE` statements and nothing destructive.)

- [ ] **Step 6: Commit**

```bash
git add src/core/knowledge src/server/drizzle/schemas/knowledge-schema.ts drizzle/0005_*.sql drizzle/meta
git commit -m "feat(knowledge): add person and vacancy node types"
```

---

### Task 2: Recruitment domain schemas & types

**Files:**
- Create: `src/core/recruitment/domain/schemas.ts`
- Create: `src/core/recruitment/domain/types.ts`
- Test: `src/core/recruitment/domain/__tests__/schemas.test.ts`

**Interfaces:**
- Produces (consumed by every later task): `Vacancy`, `Candidate`, `Analysis`, `RankedCandidate`, `PersonListItem`, `VacancyListItem`, `OffboardInput`, `CreateManualVacancyInput`, `CandidateProfile`, `AnalysisOutput`, `PublicVacancy` types + their schemas; `benchmarkTypeSchema`, `vacancyStatusSchema`, `candidateStatusSchema`.

- [ ] **Step 1: Write the failing test**

Create `src/core/recruitment/domain/__tests__/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
    analysisOutputSchema,
    applyInputSchema,
    candidateProfileSchema,
    createManualVacancySchema,
    offboardInputSchema,
    vacancySchema,
} from "../schemas";

describe("recruitment domain schemas", () => {
    it("parses a person-benchmark vacancy", () => {
        const v = vacancySchema.parse({
            id: "m1",
            organizationId: "org1",
            title: "Backend Senior",
            benchmarkType: "person",
            manualDescription: null,
            publicToken: "a".repeat(64),
            status: "open",
            createdAt: new Date().toISOString(),
        });
        expect(v.benchmarkType).toBe("person");
    });

    it("rejects a manual vacancy without description", () => {
        const result = createManualVacancySchema.safeParse({
            title: "X",
            description: "",
        });
        expect(result.success).toBe(false);
    });

    it("bounds offboard titles", () => {
        expect(offboardInputSchema.safeParse({ title: "" }).success).toBe(
            false,
        );
        expect(
            offboardInputSchema.safeParse({ title: "Backend Senior" }).success,
        ).toBe(true);
    });

    it("caps analysis output shapes", () => {
        const base = {
            score: 82,
            dimensions: [
                { name: "Procesos", score: 90, strengths: ["a"], gaps: [] },
                { name: "Dominio", score: 70, strengths: [], gaps: ["b"] },
                { name: "Criterio", score: 85, strengths: ["c"], gaps: [] },
            ],
            summary: "Buen fit",
            interviewQuestions: ["q1", "q2", "q3"],
        };
        expect(analysisOutputSchema.parse(base).score).toBe(82);
        expect(
            analysisOutputSchema.safeParse({ ...base, score: 120 }).success,
        ).toBe(false);
        expect(
            analysisOutputSchema.safeParse({ ...base, dimensions: [] })
                .success,
        ).toBe(false);
    });

    it("requires plainText in a parsed CV profile", () => {
        const p = candidateProfileSchema.parse({
            plainText: "CV text",
            summary: "Dev backend",
            skills: ["postgres"],
            yearsOfExperience: 5,
            experience: [{ role: "Dev", company: "Acme", summary: "apis" }],
        });
        expect(p.skills).toContain("postgres");
    });

    it("validates apply input sizes", () => {
        expect(
            applyInputSchema.safeParse({
                token: "t",
                name: "Ana",
                email: "ana@x.com",
                cv: { data: new Uint8Array([1]), filename: "cv.pdf", mediaType: "application/pdf" },
            }).success,
        ).toBe(true);
        expect(
            applyInputSchema.safeParse({
                token: "t",
                name: "Ana",
                email: "not-an-email",
                cv: { data: new Uint8Array([1]), filename: "cv.pdf", mediaType: "application/pdf" },
            }).success,
        ).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/core/recruitment/domain/__tests__/schemas.test.ts`
Expected: FAIL — module `../schemas` does not exist.

- [ ] **Step 3: Implement the schemas and types**

Create `src/core/recruitment/domain/schemas.ts`:

```ts
import { z } from "zod";

// ── Enums (mirror the Drizzle pg enums from Task 3) ──────────────────────────
export const benchmarkTypeSchema = z.enum(["person", "manual"]);
export const vacancyStatusSchema = z.enum(["open", "filled", "closed"]);
export const candidateStatusSchema = z.enum([
    "pending",
    "analyzed",
    "failed",
]);

// ── Wire shapes ───────────────────────────────────────────────────────────────
export const vacancySchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    title: z.string(),
    benchmarkType: benchmarkTypeSchema,
    manualDescription: z.string().nullable(),
    publicToken: z.string(),
    status: vacancyStatusSchema,
    createdAt: z.string(),
});

export const vacancyListItemSchema = vacancySchema.extend({
    candidateCount: z.number().int().nonnegative(),
});

export const candidateSchema = z.object({
    id: z.string(),
    vacancyId: z.string(),
    name: z.string(),
    email: z.string(),
    cvFilename: z.string(),
    status: candidateStatusSchema,
    createdAt: z.string(),
});

export const analysisDimensionSchema = z.object({
    name: z.string(),
    score: z.number().min(0).max(100),
    strengths: z.array(z.string()),
    gaps: z.array(z.string()),
});

export const analysisSchema = z.object({
    candidateId: z.string(),
    score: z.number().min(0).max(100),
    dimensions: z.array(analysisDimensionSchema),
    summary: z.string(),
    interviewQuestions: z.array(z.string()),
    createdAt: z.string(),
});

export const rankedCandidateSchema = z.object({
    candidate: candidateSchema,
    analysis: analysisSchema.nullable(),
});

export const personListItemSchema = z.object({
    memberId: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    /** Graph state: person node, vacancy node (already offboarded), or none. */
    nodeType: z.enum(["person", "vacancy"]).nullable(),
    /** Set iff nodeType is "vacancy" (vacancy id == node id == memberId). */
    vacancyId: z.string().nullable(),
});

export const publicVacancySchema = z.object({
    title: z.string(),
    organizationName: z.string(),
});

// ── Admin inputs ──────────────────────────────────────────────────────────────
export const offboardInputSchema = z.object({
    title: z.string().trim().min(1).max(200),
});

export const createManualVacancySchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(10_000),
});

// ── LLM outputs (structured generateObject targets) ──────────────────────────
export const candidateProfileSchema = z.object({
    /** Full cleaned plain text of the CV — stored as `cvText`. */
    plainText: z.string().min(1).max(100_000),
    summary: z.string().max(2000),
    skills: z.array(z.string().max(100)).max(50),
    yearsOfExperience: z.number().nonnegative().nullable(),
    experience: z
        .array(
            z.object({
                role: z.string().max(200),
                company: z.string().max(200),
                summary: z.string().max(1000),
            }),
        )
        .max(20),
});

export const analysisOutputSchema = z.object({
    score: z.number().min(0).max(100),
    dimensions: z.array(analysisDimensionSchema).min(3).max(6),
    summary: z.string().max(4000),
    interviewQuestions: z.array(z.string().max(500)).min(3).max(10),
});

// ── Public apply input (service-level; the route parses multipart with
//    Elysia t.File — see Global Constraints) ───────────────────────────────────
export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const MAX_CANDIDATES_PER_VACANCY = 200;

export const applyInputSchema = z.object({
    token: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(200),
    email: z.email().max(320),
    cv: z.object({
        data: z.instanceof(Uint8Array),
        filename: z.string().trim().min(1).max(300),
        mediaType: z.literal("application/pdf"),
    }),
    /** Honeypot — real users never fill this. */
    website: z.string().max(0).optional(),
});
```

Create `src/core/recruitment/domain/types.ts`:

```ts
import type { z } from "zod";
import type {
    analysisDimensionSchema,
    analysisOutputSchema,
    analysisSchema,
    applyInputSchema,
    benchmarkTypeSchema,
    candidateProfileSchema,
    candidateSchema,
    candidateStatusSchema,
    createManualVacancySchema,
    offboardInputSchema,
    personListItemSchema,
    publicVacancySchema,
    rankedCandidateSchema,
    vacancyListItemSchema,
    vacancySchema,
    vacancyStatusSchema,
} from "./schemas";

export type BenchmarkType = z.infer<typeof benchmarkTypeSchema>;
export type VacancyStatus = z.infer<typeof vacancyStatusSchema>;
export type CandidateStatus = z.infer<typeof candidateStatusSchema>;
export type Vacancy = z.infer<typeof vacancySchema>;
export type VacancyListItem = z.infer<typeof vacancyListItemSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type AnalysisDimension = z.infer<typeof analysisDimensionSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type RankedCandidate = z.infer<typeof rankedCandidateSchema>;
export type PersonListItem = z.infer<typeof personListItemSchema>;
export type PublicVacancy = z.infer<typeof publicVacancySchema>;
export type OffboardInput = z.infer<typeof offboardInputSchema>;
export type CreateManualVacancyInput = z.infer<
    typeof createManualVacancySchema
>;
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;
export type ApplyInput = z.infer<typeof applyInputSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/core/recruitment/domain/__tests__/schemas.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/recruitment/domain
git commit -m "feat(recruitment): domain schemas and types"
```

---

### Task 3: Recruitment Drizzle tables + migration

**Files:**
- Create: `src/server/drizzle/schemas/recruitment-schema.ts`
- Modify: `src/server/drizzle/schemas/index.ts`
- Create: `drizzle/0006_*.sql` (generated)

**Interfaces:**
- Consumes: `CandidateProfile`, `AnalysisDimension` from `@/core/recruitment/domain/types` (type-only imports for jsonb `$type`).
- Produces: `vacancy`, `candidate`, `analysis` tables; row types `VacancyRow`, `NewVacancyRow`, `CandidateRow`, `NewCandidateRow`, `AnalysisRow`, `NewAnalysisRow` — used by all repository modules.

- [ ] **Step 1: Write the table module**

Create `src/server/drizzle/schemas/recruitment-schema.ts`:

```ts
import {
    index,
    jsonb,
    pgEnum,
    pgTable,
    real,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
    AnalysisDimension,
    CandidateProfile,
} from "@/core/recruitment/domain/types";
import { organization } from "./organization-schema";

export const vacancyBenchmarkType = pgEnum("vacancy_benchmark_type", [
    "person",
    "manual",
]);
export const vacancyStatus = pgEnum("vacancy_status", [
    "open",
    "filled",
    "closed",
]);
export const candidateStatus = pgEnum("candidate_status", [
    "pending",
    "analyzed",
    "failed",
]);

/**
 * An open role. `id` is also the id of its `vacancy` knowledge node — for
 * person-born vacancies that is the departed member's id, so the whole
 * person's subgraph stays attached to the vacancy.
 */
export const vacancy = pgTable(
    "vacancy",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        benchmarkType: vacancyBenchmarkType("benchmark_type").notNull(),
        manualDescription: text("manual_description"),
        publicToken: text("public_token").notNull().unique(),
        status: vacancyStatus("status").default("open").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("vacancy_organization_id_idx").on(table.organizationId)],
);

/**
 * One application to a vacancy. The original PDF is NOT retained — only the
 * extracted plain text and the LLM-structured profile.
 */
export const candidate = pgTable(
    "candidate",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        vacancyId: text("vacancy_id")
            .notNull()
            .references(() => vacancy.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        email: text("email").notNull(),
        cvFilename: text("cv_filename").notNull(),
        cvText: text("cv_text").notNull(),
        profile: jsonb("profile").$type<CandidateProfile>().notNull(),
        status: candidateStatus("status").default("pending").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("candidate_vacancy_id_idx").on(table.vacancyId),
        // One application per email per vacancy.
        uniqueIndex("candidate_vacancy_email_uq").on(
            table.vacancyId,
            table.email,
        ),
    ],
);

/** LLM comparison of a candidate against the vacancy benchmark. 1:1. */
export const analysis = pgTable("analysis", {
    candidateId: text("candidate_id")
        .primaryKey()
        .references(() => candidate.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    dimensions: jsonb("dimensions").$type<AnalysisDimension[]>().notNull(),
    summary: text("summary").notNull(),
    interviewQuestions: jsonb("interview_questions")
        .$type<string[]>()
        .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VacancyRow = typeof vacancy.$inferSelect;
export type NewVacancyRow = typeof vacancy.$inferInsert;
export type CandidateRow = typeof candidate.$inferSelect;
export type NewCandidateRow = typeof candidate.$inferInsert;
export type AnalysisRow = typeof analysis.$inferSelect;
export type NewAnalysisRow = typeof analysis.$inferInsert;
```

Modify `src/server/drizzle/schemas/index.ts` — add the line (keep alphabetical order):

```ts
export * from "./recruitment-schema";
```

- [ ] **Step 2: Generate the migration and verify the SQL**

Run: `pnpm db:generate`
Expected: new `drizzle/0006_<name>.sql` creating the three enums and the `vacancy`, `candidate`, `analysis` tables with the FKs and the `candidate_vacancy_email_uq` unique index.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean (the schema compiles; nothing consumes it yet).

- [ ] **Step 4: Commit**

```bash
git add src/server/drizzle drizzle/0006_*.sql drizzle/meta
git commit -m "feat(recruitment): vacancy, candidate, analysis tables"
```

---

### Task 4: Shared `assertOrgAdmin` + people repository + list-people service

**Files:**
- Create: `src/server/auth/require-org-admin.ts`
- Create: `src/core/recruitment/server/repository/people.ts`
- Create: `src/core/recruitment/server/services/list-people-service.ts`
- Test: `src/core/recruitment/server/services/__tests__/list-people-service.test.ts`

**Interfaces:**
- Produces:
  - `assertOrgAdmin(userId: string, organizationId: string): AsyncAppResult<void>` — shared admin gate consumed by every recruitment service.
  - `findOrgMembers(organizationId: string): Promise<OrgMemberRecord[]>` where `OrgMemberRecord = { memberId: string; name: string; email: string; role: string }`.
  - `findPeopleNodes(organizationId: string): Promise<KnowledgeNodeRow[]>` — only `person`/`vacancy` nodes.
  - `upsertPersonNodes(organizationId: string, members: { memberId: string; name: string }[]): Promise<void>` — insert-on-conflict-do-nothing, `id = memberId`.
  - `listPeopleService(userId: string, organizationId: string): AsyncAppResult<PersonListItem[]>`.

- [ ] **Step 1: Write the failing test**

Create `src/core/recruitment/server/services/__tests__/list-people-service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("../../repository/people", () => ({
    findOrgMembers: vi.fn(),
    findPeopleNodes: vi.fn(),
    upsertPersonNodes: vi.fn(),
}));

import type { KnowledgeNodeRow } from "@/server/drizzle/schemas/knowledge-schema";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    findOrgMembers,
    findPeopleNodes,
    upsertPersonNodes,
} from "../../repository/people";
import { listPeopleService } from "../list-people-service";

const ORG = "org1";
const ADMIN = "admin-user";

const nodeRow = (over: Partial<KnowledgeNodeRow> = {}): KnowledgeNodeRow => ({
    id: "m1",
    organizationId: ORG,
    personId: null,
    type: "person",
    label: "Ana",
    summary: null,
    embedding: null,
    sourceChunkId: null,
    origin: "manual",
    confidence: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

describe("listPeopleService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "owner" });
        vi.mocked(findOrgMembers).mockResolvedValue([
            { memberId: "m1", name: "Ana", email: "ana@x.com", role: "owner" },
            { memberId: "m2", name: "Bob", email: "bob@x.com", role: "member" },
        ]);
        vi.mocked(findPeopleNodes).mockResolvedValue([
            nodeRow({ id: "m1", type: "vacancy" }),
        ]);
    });

    it("forbids non-admins", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "member" });
        const result = await listPeopleService("u1", ORG);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(403);
    });

    it("syncs person nodes and maps node state per member", async () => {
        const result = await listPeopleService(ADMIN, ORG);

        expect(upsertPersonNodes).toHaveBeenCalledWith(ORG, [
            { memberId: "m1", name: "Ana" },
            { memberId: "m2", name: "Bob" },
        ]);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data).toEqual([
            {
                memberId: "m1",
                name: "Ana",
                email: "ana@x.com",
                role: "owner",
                nodeType: "vacancy",
                vacancyId: "m1",
            },
            {
                memberId: "m2",
                name: "Bob",
                email: "bob@x.com",
                role: "member",
                nodeType: null,
                vacancyId: null,
            },
        ]);
    });

    it("maps repository failures to INTERNAL_SERVER_ERROR", async () => {
        vi.mocked(findOrgMembers).mockRejectedValue(new Error("db down"));
        const result = await listPeopleService(ADMIN, ORG);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/core/recruitment/server/services/__tests__/list-people-service.test.ts`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Implement the three modules**

Create `src/server/auth/require-org-admin.ts`:

```ts
import "server-only";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { getOrgMembership, ORG_ADMIN_ROLES } from "./get-org-membership";

/** DB-backed admin gate, so it lives at the service layer — routes and RSC
 *  pages only gate UI visibility. */
export async function assertOrgAdmin(
    userId: string,
    organizationId: string,
): AsyncAppResult<void> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }
    return ok(undefined);
}
```

Create `src/core/recruitment/server/repository/people.ts`:

```ts
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { user } from "@/server/drizzle/schemas/auth-schema";
import {
    type KnowledgeNodeRow,
    knowledgeNodes,
} from "@/server/drizzle/schemas/knowledge-schema";
import { member } from "@/server/drizzle/schemas/organization-schema";

export interface OrgMemberRecord {
    memberId: string;
    name: string;
    email: string;
    role: string;
}

export async function findOrgMembers(
    organizationId: string,
): Promise<OrgMemberRecord[]> {
    const rows = await db
        .select({
            memberId: member.id,
            name: user.name,
            email: user.email,
            role: member.role,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(eq(member.organizationId, organizationId))
        .orderBy(user.name);
    return rows;
}

/** Structural nodes only (`person`/`vacancy`) — the people/vacancy surface. */
export async function findPeopleNodes(
    organizationId: string,
): Promise<KnowledgeNodeRow[]> {
    return db
        .select()
        .from(knowledgeNodes)
        .where(
            and(
                eq(knowledgeNodes.organizationId, organizationId),
                inArray(knowledgeNodes.type, ["person", "vacancy"]),
            ),
        );
}

/**
 * Sync: every org member gets a `person` node whose id is the member id.
 * Insert-only — an existing node (person OR already-flipped vacancy) is
 * never touched, so re-syncs are idempotent and safe after offboarding.
 */
export async function upsertPersonNodes(
    organizationId: string,
    members: { memberId: string; name: string }[],
): Promise<void> {
    if (members.length === 0) return;
    await db
        .insert(knowledgeNodes)
        .values(
            members.map((m) => ({
                id: m.memberId,
                organizationId,
                type: "person" as const,
                label: m.name,
                origin: "manual" as const,
            })),
        )
        .onConflictDoNothing({ target: knowledgeNodes.id });
}
```

Create `src/core/recruitment/server/services/list-people-service.ts`:

```ts
import "server-only";
import type { PersonListItem } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    findOrgMembers,
    findPeopleNodes,
    upsertPersonNodes,
} from "../repository/people";

/**
 * The People surface: org members plus their graph state. Opening it syncs
 * member → `person` nodes (idempotent) so every member is visible in the
 * graph before any offboarding happens.
 */
export async function listPeopleService(
    userId: string,
    organizationId: string,
): AsyncAppResult<PersonListItem[]> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const members = await findOrgMembers(organizationId);
        await upsertPersonNodes(
            organizationId,
            members.map(({ memberId, name }) => ({ memberId, name })),
        );
        const nodes = await findPeopleNodes(organizationId);
        const nodeById = new Map(nodes.map((n) => [n.id, n]));

        return ok(
            members.map((m) => {
                const node = nodeById.get(m.memberId);
                const nodeType =
                    node?.type === "person" || node?.type === "vacancy"
                        ? node.type
                        : null;
                return {
                    memberId: m.memberId,
                    name: m.name,
                    email: m.email,
                    role: m.role,
                    nodeType,
                    vacancyId: nodeType === "vacancy" ? m.memberId : null,
                };
            }),
        );
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/core/recruitment/server/services/__tests__/list-people-service.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/require-org-admin.ts src/core/recruitment/server
git commit -m "feat(recruitment): people sync + list service with admin gate"
```

---

### Task 5: Vacancy repository + offboard-person service

**Files:**
- Create: `src/core/recruitment/server/repository/utils.ts`
- Create: `src/core/recruitment/server/repository/vacancies.ts`
- Create: `src/core/recruitment/server/services/public-token.ts`
- Create: `src/core/recruitment/server/services/offboard-person-service.ts`
- Test: `src/core/recruitment/server/services/__tests__/offboard-person-service.test.ts`

**Interfaces:**
- Consumes: `upsertPersonNodes` is NOT reused here; the flip is its own repo call (below). `assertOrgAdmin` from Task 4. `offboardInputSchema` from Task 2.
- Produces:
  - `toVacancy(row: VacancyRow): Vacancy`, `toCandidate(row: CandidateRow): Candidate`, `toAnalysis(row: AnalysisRow): Analysis` (repository/utils).
  - `generatePublicToken(): string` — 64 hex chars.
  - `flipPersonNodeToVacancy(organizationId: string, memberId: string, title: string): Promise<void>` — upsert: insert `vacancy` node or flip existing `person` node in place.
  - `insertVacancy(row: NewVacancyRow): Promise<VacancyRow>`, `findVacancyById(organizationId, id): Promise<VacancyRow | null>`, `findVacancyByToken(token): Promise<(VacancyRow & { organizationName: string }) | null>`, `listVacancies(organizationId): Promise<(VacancyRow & { candidateCount: number })[]>`, `setVacancyStatus(organizationId, id, status): Promise<VacancyRow | null>`, `setVacancyToken(organizationId, id, token): Promise<VacancyRow | null>`, `countCandidates(vacancyId): Promise<number>`.
  - `offboardPersonService(userId, organizationId, memberId, input: OffboardInput): AsyncAppResult<Vacancy>`.

- [ ] **Step 1: Write the failing test**

Create `src/core/recruitment/server/services/__tests__/offboard-person-service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("../../repository/people", () => ({ findOrgMembers: vi.fn() }));
vi.mock("../../repository/vacancies", () => ({
    flipPersonNodeToVacancy: vi.fn(),
    findVacancyById: vi.fn(),
    insertVacancy: vi.fn(),
}));

import type { VacancyRow } from "@/server/drizzle/schemas/recruitment-schema";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import { findOrgMembers } from "../../repository/people";
import {
    findVacancyById,
    flipPersonNodeToVacancy,
    insertVacancy,
} from "../../repository/vacancies";
import { offboardPersonService } from "../offboard-person-service";

const ORG = "org1";
const ADMIN = "admin-user";
const MEMBER = "m1";

const vacancyRow = (over: Partial<VacancyRow> = {}): VacancyRow => ({
    id: MEMBER,
    organizationId: ORG,
    title: "Backend Senior",
    benchmarkType: "person",
    manualDescription: null,
    publicToken: "t".repeat(64),
    status: "open",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

describe("offboardPersonService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "admin" });
        vi.mocked(findOrgMembers).mockResolvedValue([
            { memberId: MEMBER, name: "Ana", email: "ana@x.com", role: "member" },
        ]);
        vi.mocked(findVacancyById).mockResolvedValue(null);
        vi.mocked(insertVacancy).mockImplementation(async (row) =>
            vacancyRow({ ...row, id: row.id ?? MEMBER } as VacancyRow),
        );
    });

    it("flips the person node in place and creates the vacancy with the member id", async () => {
        const result = await offboardPersonService(ADMIN, ORG, MEMBER, {
            title: "Backend Senior",
        });

        expect(flipPersonNodeToVacancy).toHaveBeenCalledWith(
            ORG,
            MEMBER,
            "Backend Senior",
        );
        const inserted = vi.mocked(insertVacancy).mock.calls[0][0];
        expect(inserted.id).toBe(MEMBER);
        expect(inserted.benchmarkType).toBe("person");
        expect(inserted.manualDescription).toBeNull();
        expect(inserted.publicToken).toMatch(/^[0-9a-f]{64}$/);

        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data.id).toBe(MEMBER);
    });

    it("conflicts when the member already has a vacancy", async () => {
        vi.mocked(findVacancyById).mockResolvedValue(vacancyRow());
        const result = await offboardPersonService(ADMIN, ORG, MEMBER, {
            title: "X",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("CONFLICT");
        expect(insertVacancy).not.toHaveBeenCalled();
    });

    it("404s when the member is not in the org", async () => {
        vi.mocked(findOrgMembers).mockResolvedValue([]);
        const result = await offboardPersonService(ADMIN, ORG, "ghost", {
            title: "X",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(404);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/core/recruitment/server/services/__tests__/offboard-person-service.test.ts`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Implement the modules**

Create `src/core/recruitment/server/repository/utils.ts`:

```ts
import type {
    Analysis,
    Candidate,
    Vacancy,
} from "@/core/recruitment/domain/types";
import type {
    AnalysisRow,
    CandidateRow,
    VacancyRow,
} from "@/server/drizzle/schemas/recruitment-schema";

export const toVacancy = (row: VacancyRow): Vacancy => ({
    id: row.id,
    organizationId: row.organizationId,
    title: row.title,
    benchmarkType: row.benchmarkType,
    manualDescription: row.manualDescription,
    publicToken: row.publicToken,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
});

export const toCandidate = (row: CandidateRow): Candidate => ({
    id: row.id,
    vacancyId: row.vacancyId,
    name: row.name,
    email: row.email,
    cvFilename: row.cvFilename,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
});

export const toAnalysis = (row: AnalysisRow): Analysis => ({
    candidateId: row.candidateId,
    score: row.score,
    dimensions: row.dimensions,
    summary: row.summary,
    interviewQuestions: row.interviewQuestions,
    createdAt: row.createdAt.toISOString(),
});
```

Create `src/core/recruitment/server/services/public-token.ts`:

```ts
import "server-only";
import { randomBytes } from "node:crypto";

/** Opaque public identifier for the apply portal — never the vacancy id. */
export const generatePublicToken = (): string =>
    randomBytes(32).toString("hex");
```

Create `src/core/recruitment/server/repository/vacancies.ts`:

```ts
import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import type { VacancyStatus } from "@/core/recruitment/domain/types";
import { db } from "@/server/drizzle/db";
import { knowledgeNodes } from "@/server/drizzle/schemas/knowledge-schema";
import { organization } from "@/server/drizzle/schemas/organization-schema";
import {
    candidate,
    type NewVacancyRow,
    vacancy,
    type VacancyRow,
} from "@/server/drizzle/schemas/recruitment-schema";

/**
 * Offboarding: the member's node becomes the vacancy in place. Insert when
 * the node doesn't exist yet; on conflict flip type + label only — the id,
 * edges, and every `personId` attribution elsewhere are deliberately left
 * untouched (the knowledge outlives the departure).
 */
export async function flipPersonNodeToVacancy(
    organizationId: string,
    memberId: string,
    title: string,
): Promise<void> {
    await db
        .insert(knowledgeNodes)
        .values({
            id: memberId,
            organizationId,
            type: "vacancy",
            label: title,
            origin: "manual",
        })
        .onConflictDoUpdate({
            target: knowledgeNodes.id,
            set: { type: "vacancy", label: title },
        });
}

export async function insertVacancy(row: NewVacancyRow): Promise<VacancyRow> {
    const [inserted] = await db.insert(vacancy).values(row).returning();
    return inserted;
}

export async function findVacancyById(
    organizationId: string,
    id: string,
): Promise<VacancyRow | null> {
    const [row] = await db
        .select()
        .from(vacancy)
        .where(and(eq(vacancy.organizationId, organizationId), eq(vacancy.id, id)))
        .limit(1);
    return row ?? null;
}

/** Public-portal lookup — joins the org name for the landing copy. */
export async function findVacancyByToken(
    token: string,
): Promise<(VacancyRow & { organizationName: string }) | null> {
    const [row] = await db
        .select({ vacancy, organizationName: organization.name })
        .from(vacancy)
        .innerJoin(organization, eq(vacancy.organizationId, organization.id))
        .where(eq(vacancy.publicToken, token))
        .limit(1);
    return row ? { ...row.vacancy, organizationName: row.organizationName } : null;
}

export async function listVacancies(
    organizationId: string,
): Promise<(VacancyRow & { candidateCount: number })[]> {
    const rows = await db
        .select({
            vacancy,
            candidateCount: count(candidate.id),
        })
        .from(vacancy)
        .leftJoin(candidate, eq(candidate.vacancyId, vacancy.id))
        .where(eq(vacancy.organizationId, organizationId))
        .groupBy(vacancy.id)
        .orderBy(sql`${vacancy.createdAt} desc`);
    return rows.map((r) => ({ ...r.vacancy, candidateCount: r.candidateCount }));
}

export async function setVacancyStatus(
    organizationId: string,
    id: string,
    status: VacancyStatus,
): Promise<VacancyRow | null> {
    const [row] = await db
        .update(vacancy)
        .set({ status })
        .where(and(eq(vacancy.organizationId, organizationId), eq(vacancy.id, id)))
        .returning();
    return row ?? null;
}

export async function setVacancyToken(
    organizationId: string,
    id: string,
    publicToken: string,
): Promise<VacancyRow | null> {
    const [row] = await db
        .update(vacancy)
        .set({ publicToken })
        .where(and(eq(vacancy.organizationId, organizationId), eq(vacancy.id, id)))
        .returning();
    return row ?? null;
}

export async function countCandidates(vacancyId: string): Promise<number> {
    const [row] = await db
        .select({ value: count(candidate.id) })
        .from(candidate)
        .where(eq(candidate.vacancyId, vacancyId));
    return row?.value ?? 0;
}
```

Create `src/core/recruitment/server/services/offboard-person-service.ts`:

```ts
import "server-only";
import type { OffboardInput, Vacancy } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findOrgMembers } from "../repository/people";
import { toVacancy } from "../repository/utils";
import {
    findVacancyById,
    flipPersonNodeToVacancy,
    insertVacancy,
} from "../repository/vacancies";
import { generatePublicToken } from "./public-token";

/**
 * Mark a member as departed: their graph node becomes the vacancy for their
 * replacement (same id — the member id), preserving all knowledge and the
 * per-person agent. The Better Auth membership is NOT touched here.
 */
export async function offboardPersonService(
    userId: string,
    organizationId: string,
    memberId: string,
    input: OffboardInput,
): AsyncAppResult<Vacancy> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const members = await findOrgMembers(organizationId);
        if (!members.some((m) => m.memberId === memberId)) {
            return err(AppErrors.notFound({ targets: ["memberId"] }));
        }

        const existing = await findVacancyById(organizationId, memberId);
        if (existing) {
            return err(AppErrors.conflict({ targets: ["memberId"] }));
        }

        await flipPersonNodeToVacancy(organizationId, memberId, input.title);
        const row = await insertVacancy({
            id: memberId,
            organizationId,
            title: input.title,
            benchmarkType: "person",
            manualDescription: null,
            publicToken: generatePublicToken(),
            status: "open",
        });
        return ok(toVacancy(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/core/recruitment/server/services/__tests__/offboard-person-service.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/recruitment/server
git commit -m "feat(recruitment): vacancy repository + offboard service"
```

---

### Task 6: Phase-1 API — people routes + domain router wiring

**Files:**
- Create: `src/core/recruitment/server/api/routes/list-people.route.ts`
- Create: `src/core/recruitment/server/api/routes/offboard-person.route.ts`
- Create: `src/core/recruitment/server/api/router.ts`
- Modify: `src/server/router.ts` (import + `.use(recruitmentRouter)`)

**Interfaces:**
- Consumes: `listPeopleService`, `offboardPersonService`, `offboardInputSchema`, `personListItemSchema`, `vacancySchema`.
- Produces (Eden proxy paths used by the client in Task 7+):
  - `GET /api/v1/recruitment/people` → `client.people.get`
  - `POST /api/v1/recruitment/people/:memberId/offboard` → `client.people({ memberId }).offboard.post`

- [ ] **Step 1: Write the routes**

Create `src/core/recruitment/server/api/routes/list-people.route.ts`:

```ts
import { Elysia } from "elysia";
import { z } from "zod";
import { personListItemSchema } from "@/core/recruitment/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listPeopleService } from "../../services/list-people-service";

export const listPeopleRoute = new Elysia().use(authed).get(
    "/people",
    async ({ user, session, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await listPeopleService(user.id, org.data);
        if (!result.ok)
            return status(
                result.error.status as 403 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        response: {
            200: successResponseSchema(
                z.array(personListItemSchema),
                "PersonList",
            ),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "List org members with their graph state",
            description:
                "Owner/admin only. Syncs member → person nodes and returns each member with their node type (person / vacancy / none).",
        },
    },
);
```

Create `src/core/recruitment/server/api/routes/offboard-person.route.ts`:

```ts
import { Elysia } from "elysia";
import { z } from "zod";
import {
    offboardInputSchema,
    vacancySchema,
} from "@/core/recruitment/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    createdResponseSchema,
    errorResponseSchema,
    errorToResponse,
} from "@/server/common/responses";
import { offboardPersonService } from "../../services/offboard-person-service";

export const offboardPersonRoute = new Elysia().use(authed).post(
    "/people/:memberId/offboard",
    async ({ user, session, params, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await offboardPersonService(
            user.id,
            org.data,
            params.memberId,
            body,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 409 | 500,
                errorToResponse(result.error),
            );
        return status(201, CommonResponse.created({ response: result.data }));
    },
    {
        authed: true,
        params: z.object({ memberId: z.string() }),
        body: offboardInputSchema,
        response: {
            201: createdResponseSchema(vacancySchema, "Vacancy"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            409: errorResponseSchema(409),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "Mark a member as departed — their node becomes a vacancy",
        },
    },
);
```

Create `src/core/recruitment/server/api/router.ts`:

```ts
import { Elysia } from "elysia";
import { listPeopleRoute } from "./routes/list-people.route";
import { offboardPersonRoute } from "./routes/offboard-person.route";

export const recruitmentRouter = new Elysia({ prefix: "/recruitment" })
    .use(listPeopleRoute)
    .use(offboardPersonRoute);
```

Modify `src/server/router.ts`: add the import and `.use(recruitmentRouter)` after `.use(documentReviewRouter)`:

```ts
import { recruitmentRouter } from "@/core/recruitment/server/api/router";
// ...
    .use(documentReviewRouter)
    .use(recruitmentRouter);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/core/recruitment/server/api src/server/router.ts
git commit -m "feat(recruitment): people routes + domain router"
```

---

### Task 7: People UI + sidebar entry

**Files:**
- Create: `src/core/recruitment/client/hooks.ts`
- Create: `src/core/recruitment/client/validation.ts`
- Create: `src/core/recruitment/client/ui/offboard-person-modal.tsx`
- Create: `src/core/recruitment/client/ui/people-list.tsx`
- Create: `src/app/[slug]/app/people/page.tsx`
- Create: `src/app/[slug]/app/people/error.tsx`
- Modify: `src/app/[slug]/app/app-sidebar.tsx:38-49` (NAV)

**Interfaces:**
- Consumes: Eden proxy `client.people.get` / `client.people({ memberId }).offboard.post`; `PersonListItem` type; `resolveResult` (`@/frontend/lib/result`); `requireAuth`, `requireOrganization` RSC guards; `useAppForm` (`@/frontend/hooks/use-tanstack-form`), `Field` (`@/frontend/components/ui/field`), `getFieldErrors` pattern from tables-and-forms doc.
- Produces: `useRecruitment()` factory (grows in later tasks: `useCreateVacancy`, `useRegenerateToken`, `useCloseVacancy`, `useRetryAnalysis`, `useDeleteCandidate`).

- [ ] **Step 1: Client hooks + validation**

Create `src/core/recruitment/client/hooks.ts`:

```ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useElysia } from "@/frontend/lib/eden";

/**
 * Mutation hooks for the recruitment domain. Lists are RSC-driven (pages
 * await services directly), so onSuccess refreshes the server components
 * instead of invalidating client queries.
 */
export const useRecruitment = () => {
    const client = useElysia().recruitment;
    const router = useRouter();

    const useOffboard = (memberId: string) =>
        useMutation(
            client.people({ memberId }).offboard.post.mutationOptions({
                onSuccess: () => router.refresh(),
            }),
        );

    return { useOffboard };
};
```

Create `src/core/recruitment/client/validation.ts`:

```ts
import { z } from "zod";
import { offboardInputSchema } from "@/core/recruitment/domain/schemas";

export const offboardFormSchema = offboardInputSchema;
export type OffboardFormValues = z.infer<typeof offboardFormSchema>;
```

- [ ] **Step 2: Offboard modal (TanStack Form + Field)**

Create `src/core/recruitment/client/ui/offboard-person-modal.tsx`:

```tsx
"use client";

import { Button } from "@/frontend/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/frontend/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/frontend/components/ui/field";
import { Input } from "@/frontend/components/ui/input";
import { useAppForm } from "@/frontend/hooks/use-tanstack-form";
import { useRecruitment } from "../hooks";
import { offboardFormSchema } from "../validation";

export function OffboardPersonModal({
    memberId,
    memberName,
    open,
    onOpenChange,
}: {
    memberId: string;
    memberName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { useOffboard } = useRecruitment();
    const offboard = useOffboard(memberId);

    const form = useAppForm({
        defaultValues: { title: "" },
        validators: { onChange: offboardFormSchema },
        onSubmit: async ({ value }) => {
            await offboard.mutateAsync(value);
            onOpenChange(false);
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Marcar salida de {memberName}</DialogTitle>
                    <DialogDescription>
                        Su nodo del grafo se convierte en la vacante. Todo su
                        conocimiento y su agente se preservan.
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.handleSubmit();
                    }}
                    className="space-y-4"
                >
                    <form.Field name="title">
                        {(field) => {
                            const hasError = !field.state.meta.isValid;
                            return (
                                <Field data-invalid={hasError}>
                                    <FieldLabel htmlFor={field.name}>
                                        Título de la vacante
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        placeholder="Ej. Backend Senior"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        aria-invalid={hasError}
                                    />
                                    {hasError && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <DialogFooter>
                        <form.Subscribe selector={(s) => s.canSubmit}>
                            {(canSubmit) => (
                                <Button
                                    type="submit"
                                    disabled={!canSubmit || offboard.isPending}
                                >
                                    Marcar salida y abrir vacante
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 3: People list (client component over RSC data)**

Create `src/core/recruitment/client/ui/people-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import type { PersonListItem } from "@/core/recruitment/domain/types";
import { OffboardPersonModal } from "./offboard-person-modal";

export function PeopleList({ people }: { people: PersonListItem[] }) {
    const [offboarding, setOffboarding] = useState<PersonListItem | null>(null);

    return (
        <div className="space-y-2">
            {people.map((p) => (
                <div
                    key={p.memberId}
                    className="flex items-center justify-between rounded-lg border p-4"
                >
                    <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-muted-foreground text-sm">
                            {p.email} · {p.role}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {p.nodeType === "vacancy" ? (
                            <Badge variant="secondary">Vacante abierta</Badge>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setOffboarding(p)}
                            >
                                Marcar salida
                            </Button>
                        )}
                    </div>
                </div>
            ))}
            {offboarding && (
                <OffboardPersonModal
                    memberId={offboarding.memberId}
                    memberName={offboarding.name}
                    open
                    onOpenChange={(open) => !open && setOffboarding(null)}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 4: Page (RSC, admin gate) + error boundary**

Create `src/app/[slug]/app/people/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { PeopleList } from "@/core/recruitment/client/ui/people-list";
import { listPeopleService } from "@/core/recruitment/server/services/list-people-service";
import { resolveResult } from "@/frontend/lib/result";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/** Owner/admin-only surface — UI gate; `assertOrgAdmin` is the authoritative one. */
export default async function PeoplePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { user } = await requireAuth();
    const { slug } = await params;
    const { organization, role } = await requireOrganization(slug, user.id);
    if (!ADMIN_ROLES.has(role)) notFound();

    const people = await resolveResult(
        listPeopleService(user.id, organization.id),
    );

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
            <div>
                <h1 className="font-semibold text-xl">Personas</h1>
                <p className="text-muted-foreground text-sm">
                    Cuando alguien sale, su nodo se convierte en la vacante y su
                    conocimiento queda disponible para reclutar y capacitar.
                </p>
            </div>
            <PeopleList people={people} />
        </div>
    );
}
```

Create `src/app/[slug]/app/people/error.tsx` (same shape as the sibling `documents/error.tsx` — copy its content verbatim and adjust the heading text to "Personas").

- [ ] **Step 5: Sidebar entries**

Modify `src/app/[slug]/app/app-sidebar.tsx` — add `Briefcase`, `Users` to the lucide imports and two items to `NAV`, after "Documentos":

```ts
    { title: "Personas", segment: "people", icon: Users, adminOnly: true },
    {
        title: "Contratación",
        segment: "hiring",
        icon: Briefcase,
        adminOnly: true,
    },
```

- [ ] **Step 6: Verify + commit**

Run: `pnpm typecheck && pnpm check`
Expected: clean (run `pnpm check:fix` first if biome complains about import order, then re-check).

```bash
git add src/core/recruitment/client "src/app/[slug]/app/people" src/app/[slug]/app/app-sidebar.tsx
git commit -m "feat(recruitment): people view with offboarding action"
```

---

### Task 8: Vacancy management services (manual create, list, get, close, regenerate token)

**Files:**
- Create: `src/core/recruitment/server/services/create-manual-vacancy-service.ts`
- Create: `src/core/recruitment/server/services/list-vacancies-service.ts`
- Create: `src/core/recruitment/server/services/get-vacancy-service.ts`
- Create: `src/core/recruitment/server/services/close-vacancy-service.ts`
- Create: `src/core/recruitment/server/services/regenerate-token-service.ts`
- Test: `src/core/recruitment/server/services/__tests__/vacancy-services.test.ts`

**Interfaces:**
- Consumes: `vacancies` repository from Task 5 (+ one new repo fn below), `insertNodes`-equivalent — no: manual vacancy nodes are written by a new repo fn in `vacancies.ts`.
- Produces:
  - New repo fn in `vacancies.ts`: `insertVacancyNode(organizationId: string, id: string, title: string): Promise<void>` (type `vacancy`, `origin: "manual"`, `label: title`).
  - `createManualVacancyService(userId, organizationId, input: CreateManualVacancyInput): AsyncAppResult<Vacancy>`
  - `listVacanciesService(userId, organizationId): AsyncAppResult<VacancyListItem[]>`
  - `getVacancyService(userId, organizationId, id): AsyncAppResult<Vacancy>`
  - `closeVacancyService(userId, organizationId, id): AsyncAppResult<Vacancy>`
  - `regenerateTokenService(userId, organizationId, id): AsyncAppResult<Vacancy>`

- [ ] **Step 1: Write the failing test**

Create `src/core/recruitment/server/services/__tests__/vacancy-services.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("../../repository/vacancies", () => ({
    insertVacancyNode: vi.fn(),
    insertVacancy: vi.fn(),
    findVacancyById: vi.fn(),
    listVacancies: vi.fn(),
    setVacancyStatus: vi.fn(),
    setVacancyToken: vi.fn(),
}));

import type { VacancyRow } from "@/server/drizzle/schemas/recruitment-schema";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    findVacancyById,
    insertVacancy,
    insertVacancyNode,
    listVacancies,
    setVacancyStatus,
    setVacancyToken,
} from "../../repository/vacancies";
import { closeVacancyService } from "../close-vacancy-service";
import { createManualVacancyService } from "../create-manual-vacancy-service";
import { getVacancyService } from "../get-vacancy-service";
import { listVacanciesService } from "../list-vacancies-service";
import { regenerateTokenService } from "../regenerate-token-service";

const ORG = "org1";
const ADMIN = "admin-user";

const vacancyRow = (over: Partial<VacancyRow> = {}): VacancyRow => ({
    id: "v1",
    organizationId: ORG,
    title: "Data Analyst",
    benchmarkType: "manual",
    manualDescription: "SQL + dashboards",
    publicToken: "a".repeat(64),
    status: "open",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

describe("vacancy services", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "owner" });
        vi.mocked(insertVacancy).mockImplementation(async (row) =>
            vacancyRow(row as VacancyRow),
        );
        vi.mocked(findVacancyById).mockResolvedValue(vacancyRow());
        vi.mocked(listVacancies).mockResolvedValue([
            { ...vacancyRow(), candidateCount: 3 },
        ]);
        vi.mocked(setVacancyStatus).mockResolvedValue(
            vacancyRow({ status: "closed" }),
        );
        vi.mocked(setVacancyToken).mockResolvedValue(
            vacancyRow({ publicToken: "b".repeat(64) }),
        );
    });

    it("creates a manual vacancy with a graph node and generated token", async () => {
        const result = await createManualVacancyService(ADMIN, ORG, {
            title: "Data Analyst",
            description: "SQL + dashboards",
        });

        expect(insertVacancyNode).toHaveBeenCalledOnce();
        const [orgArg, idArg, titleArg] =
            vi.mocked(insertVacancyNode).mock.calls[0];
        expect(orgArg).toBe(ORG);
        expect(titleArg).toBe("Data Analyst");

        const inserted = vi.mocked(insertVacancy).mock.calls[0][0];
        expect(inserted.id).toBe(idArg); // vacancy id == node id
        expect(inserted.benchmarkType).toBe("manual");
        expect(inserted.manualDescription).toBe("SQL + dashboards");
        expect(inserted.publicToken).toMatch(/^[0-9a-f]{64}$/);
        expect(result.ok).toBe(true);
    });

    it("lists vacancies with candidate counts", async () => {
        const result = await listVacanciesService(ADMIN, ORG);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data[0].candidateCount).toBe(3);
            expect(result.data[0].title).toBe("Data Analyst");
        }
    });

    it("gets a vacancy or 404s", async () => {
        const found = await getVacancyService(ADMIN, ORG, "v1");
        expect(found.ok).toBe(true);

        vi.mocked(findVacancyById).mockResolvedValue(null);
        const missing = await getVacancyService(ADMIN, ORG, "ghost");
        expect(missing.ok).toBe(false);
        if (!missing.ok) expect(missing.error.status).toBe(404);
    });

    it("closes a vacancy and 404s on unknown id", async () => {
        const closed = await closeVacancyService(ADMIN, ORG, "v1");
        expect(closed.ok).toBe(true);
        if (closed.ok) expect(closed.data.status).toBe("closed");
        expect(setVacancyStatus).toHaveBeenCalledWith(ORG, "v1", "closed");

        vi.mocked(setVacancyStatus).mockResolvedValue(null);
        const missing = await closeVacancyService(ADMIN, ORG, "ghost");
        expect(missing.ok).toBe(false);
        if (!missing.ok) expect(missing.error.status).toBe(404);
    });

    it("regenerates the public token", async () => {
        const result = await regenerateTokenService(ADMIN, ORG, "v1");
        expect(result.ok).toBe(true);
        const [orgArg, idArg, tokenArg] =
            vi.mocked(setVacancyToken).mock.calls[0];
        expect(orgArg).toBe(ORG);
        expect(idArg).toBe("v1");
        expect(tokenArg).toMatch(/^[0-9a-f]{64}$/);
        expect(tokenArg).not.toBe("a".repeat(64));
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/core/recruitment/server/services/__tests__/vacancy-services.test.ts`
Expected: FAIL — service modules don't exist (and `insertVacancyNode` is not in the repository mock target yet).

- [ ] **Step 3: Implement**

Append to `src/core/recruitment/server/repository/vacancies.ts`:

```ts
/** Graph twin of a manual vacancy — vacancy id == node id. */
export async function insertVacancyNode(
    organizationId: string,
    id: string,
    title: string,
): Promise<void> {
    await db.insert(knowledgeNodes).values({
        id,
        organizationId,
        type: "vacancy",
        label: title,
        origin: "manual",
    });
}
```

Create `src/core/recruitment/server/services/create-manual-vacancy-service.ts`:

```ts
import "server-only";
import type {
    CreateManualVacancyInput,
    Vacancy,
} from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { toVacancy } from "../repository/utils";
import { insertVacancy, insertVacancyNode } from "../repository/vacancies";
import { generatePublicToken } from "./public-token";

/** A vacancy with no reference person — the manual description is the benchmark. */
export async function createManualVacancyService(
    userId: string,
    organizationId: string,
    input: CreateManualVacancyInput,
): AsyncAppResult<Vacancy> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const id = crypto.randomUUID();
        await insertVacancyNode(organizationId, id, input.title);
        const row = await insertVacancy({
            id,
            organizationId,
            title: input.title,
            benchmarkType: "manual",
            manualDescription: input.description,
            publicToken: generatePublicToken(),
            status: "open",
        });
        return ok(toVacancy(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

Create `src/core/recruitment/server/services/list-vacancies-service.ts`:

```ts
import "server-only";
import type { VacancyListItem } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { toVacancy } from "../repository/utils";
import { listVacancies } from "../repository/vacancies";

export async function listVacanciesService(
    userId: string,
    organizationId: string,
): AsyncAppResult<VacancyListItem[]> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const rows = await listVacancies(organizationId);
        return ok(
            rows.map((row) => ({
                ...toVacancy(row),
                candidateCount: row.candidateCount,
            })),
        );
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

Create `src/core/recruitment/server/services/get-vacancy-service.ts`:

```ts
import "server-only";
import type { Vacancy } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { toVacancy } from "../repository/utils";
import { findVacancyById } from "../repository/vacancies";

export async function getVacancyService(
    userId: string,
    organizationId: string,
    id: string,
): AsyncAppResult<Vacancy> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const row = await findVacancyById(organizationId, id);
        if (!row) return err(AppErrors.notFound({ targets: ["id"] }));
        return ok(toVacancy(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

Create `src/core/recruitment/server/services/close-vacancy-service.ts`:

```ts
import "server-only";
import type { Vacancy } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { toVacancy } from "../repository/utils";
import { setVacancyStatus } from "../repository/vacancies";

export async function closeVacancyService(
    userId: string,
    organizationId: string,
    id: string,
): AsyncAppResult<Vacancy> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const row = await setVacancyStatus(organizationId, id, "closed");
        if (!row) return err(AppErrors.notFound({ targets: ["id"] }));
        return ok(toVacancy(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

Create `src/core/recruitment/server/services/regenerate-token-service.ts`:

```ts
import "server-only";
import type { Vacancy } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { toVacancy } from "../repository/utils";
import { setVacancyToken } from "../repository/vacancies";
import { generatePublicToken } from "./public-token";

/** Rotates the public apply link — old links stop working immediately. */
export async function regenerateTokenService(
    userId: string,
    organizationId: string,
    id: string,
): AsyncAppResult<Vacancy> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const row = await setVacancyToken(
            organizationId,
            id,
            generatePublicToken(),
        );
        if (!row) return err(AppErrors.notFound({ targets: ["id"] }));
        return ok(toVacancy(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/core/recruitment/server/services/__tests__/vacancy-services.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/recruitment/server
git commit -m "feat(recruitment): vacancy management services"
```

---

### Task 9: Vacancy routes + hiring UI (list, create modal, detail shell)

**Files:**
- Create: `src/core/recruitment/server/api/routes/list-vacancies.route.ts`
- Create: `src/core/recruitment/server/api/routes/create-vacancy.route.ts`
- Create: `src/core/recruitment/server/api/routes/get-vacancy.route.ts`
- Create: `src/core/recruitment/server/api/routes/close-vacancy.route.ts`
- Create: `src/core/recruitment/server/api/routes/regenerate-token.route.ts`
- Modify: `src/core/recruitment/server/api/router.ts`
- Modify: `src/core/recruitment/client/hooks.ts` (add `useCreateVacancy`, `useRegenerateToken`, `useCloseVacancy`)
- Modify: `src/core/recruitment/client/validation.ts` (add `createVacancyFormSchema`)
- Create: `src/core/recruitment/client/ui/create-vacancy-modal.tsx`
- Create: `src/core/recruitment/client/ui/vacancy-list.tsx`
- Create: `src/core/recruitment/client/ui/vacancy-admin-panel.tsx`
- Create: `src/app/[slug]/app/hiring/page.tsx`
- Create: `src/app/[slug]/app/hiring/error.tsx`
- Create: `src/app/[slug]/app/hiring/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 8 services; zod schemas from Task 2.
- Produces (Eden paths):
  - `GET /recruitment/vacancies` → `client.vacancies.get`
  - `POST /recruitment/vacancies` → `client.vacancies.post`
  - `GET /recruitment/vacancies/:id` → `client.vacancies({ id }).get`
  - `POST /recruitment/vacancies/:id/close` → `client.vacancies({ id }).close.post`
  - `POST /recruitment/vacancies/:id/regenerate-token` → `client.vacancies({ id })["regenerate-token"].post`

- [ ] **Step 1: Routes**

`list-vacancies.route.ts`:

```ts
import { Elysia } from "elysia";
import { z } from "zod";
import { vacancyListItemSchema } from "@/core/recruitment/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listVacanciesService } from "../../services/list-vacancies-service";

export const listVacanciesRoute = new Elysia().use(authed).get(
    "/vacancies",
    async ({ user, session, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await listVacanciesService(user.id, org.data);
        if (!result.ok)
            return status(
                result.error.status as 403 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        response: {
            200: successResponseSchema(
                z.array(vacancyListItemSchema),
                "VacancyList",
            ),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "List the org's vacancies with candidate counts",
        },
    },
);
```

`create-vacancy.route.ts`:

```ts
import { Elysia } from "elysia";
import {
    createManualVacancySchema,
    vacancySchema,
} from "@/core/recruitment/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    createdResponseSchema,
    errorResponseSchema,
    errorToResponse,
} from "@/server/common/responses";
import { createManualVacancyService } from "../../services/create-manual-vacancy-service";

export const createVacancyRoute = new Elysia().use(authed).post(
    "/vacancies",
    async ({ user, session, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await createManualVacancyService(
            user.id,
            org.data,
            body,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 500,
                errorToResponse(result.error),
            );
        return status(201, CommonResponse.created({ response: result.data }));
    },
    {
        authed: true,
        body: createManualVacancySchema,
        response: {
            201: createdResponseSchema(vacancySchema, "Vacancy"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "Create a vacancy from a manual role description",
        },
    },
);
```

`get-vacancy.route.ts`:

```ts
import { Elysia } from "elysia";
import { z } from "zod";
import { vacancySchema } from "@/core/recruitment/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { getVacancyService } from "../../services/get-vacancy-service";

export const getVacancyRoute = new Elysia().use(authed).get(
    "/vacancies/:id",
    async ({ user, session, params, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await getVacancyService(user.id, org.data, params.id);
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        params: z.object({ id: z.string() }),
        response: {
            200: successResponseSchema(vacancySchema, "Vacancy"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: { tags: ["Recruitment"], summary: "Get one vacancy" },
    },
);
```

`close-vacancy.route.ts` and `regenerate-token.route.ts` follow the same leaf shape; the only differences:

```ts
// close-vacancy.route.ts — POST "/vacancies/:id/close", calls
// closeVacancyService(user.id, org.data, params.id); success 200 vacancySchema.
export const closeVacancyRoute = new Elysia().use(authed).post(
    "/vacancies/:id/close",
    async ({ user, session, params, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await closeVacancyService(user.id, org.data, params.id);
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        params: z.object({ id: z.string() }),
        response: {
            200: successResponseSchema(vacancySchema, "Vacancy"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: { tags: ["Recruitment"], summary: "Close a vacancy" },
    },
);
```

```ts
// regenerate-token.route.ts — POST "/vacancies/:id/regenerate-token", calls
// regenerateTokenService(user.id, org.data, params.id); success 200 vacancySchema.
export const regenerateTokenRoute = new Elysia().use(authed).post(
    "/vacancies/:id/regenerate-token",
    async ({ user, session, params, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await regenerateTokenService(
            user.id,
            org.data,
            params.id,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        params: z.object({ id: z.string() }),
        response: {
            200: successResponseSchema(vacancySchema, "Vacancy"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "Rotate the public apply link",
        },
    },
);
```

(Each in its own file with the same imports as `get-vacancy.route.ts` plus its service.)

Update `src/core/recruitment/server/api/router.ts`:

```ts
import { Elysia } from "elysia";
import { closeVacancyRoute } from "./routes/close-vacancy.route";
import { createVacancyRoute } from "./routes/create-vacancy.route";
import { getVacancyRoute } from "./routes/get-vacancy.route";
import { listPeopleRoute } from "./routes/list-people.route";
import { listVacanciesRoute } from "./routes/list-vacancies.route";
import { offboardPersonRoute } from "./routes/offboard-person.route";
import { regenerateTokenRoute } from "./routes/regenerate-token.route";

export const recruitmentRouter = new Elysia({ prefix: "/recruitment" })
    .use(listPeopleRoute)
    .use(offboardPersonRoute)
    .use(listVacanciesRoute)
    .use(createVacancyRoute)
    .use(getVacancyRoute)
    .use(closeVacancyRoute)
    .use(regenerateTokenRoute);
```

- [ ] **Step 2: Extend client hooks + validation**

Replace the body of `useRecruitment` in `src/core/recruitment/client/hooks.ts` (keep the header comment) with:

```ts
export const useRecruitment = () => {
    const client = useElysia().recruitment;
    const router = useRouter();

    const useOffboard = (memberId: string) =>
        useMutation(
            client.people({ memberId }).offboard.post.mutationOptions({
                onSuccess: () => router.refresh(),
            }),
        );

    const useCreateVacancy = () =>
        useMutation(
            client.vacancies.post.mutationOptions({
                onSuccess: () => router.refresh(),
            }),
        );

    const useRegenerateToken = (id: string) =>
        useMutation(
            client.vacancies({ id })["regenerate-token"].post.mutationOptions(
                { onSuccess: () => router.refresh() },
            ),
        );

    const useCloseVacancy = (id: string) =>
        useMutation(
            client.vacancies({ id }).close.post.mutationOptions({
                onSuccess: () => router.refresh(),
            }),
        );

    return {
        useOffboard,
        useCreateVacancy,
        useRegenerateToken,
        useCloseVacancy,
    };
};
```

Append to `src/core/recruitment/client/validation.ts`:

```ts
import { createManualVacancySchema } from "@/core/recruitment/domain/schemas";

export const createVacancyFormSchema = createManualVacancySchema;
export type CreateVacancyFormValues = z.infer<typeof createVacancyFormSchema>;
```

- [ ] **Step 3: Hiring UI components**

Create `src/core/recruitment/client/ui/create-vacancy-modal.tsx`:

```tsx
"use client";

import { Button } from "@/frontend/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/frontend/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/frontend/components/ui/field";
import { Input } from "@/frontend/components/ui/input";
import { Textarea } from "@/frontend/components/ui/textarea";
import { useAppForm } from "@/frontend/hooks/use-tanstack-form";
import { useRecruitment } from "../hooks";
import { createVacancyFormSchema } from "../validation";

export function CreateVacancyModal({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { useCreateVacancy } = useRecruitment();
    const createVacancy = useCreateVacancy();

    const form = useAppForm({
        defaultValues: { title: "", description: "" },
        validators: { onChange: createVacancyFormSchema },
        onSubmit: async ({ value }) => {
            await createVacancy.mutateAsync(value);
            onOpenChange(false);
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nueva vacante</DialogTitle>
                    <DialogDescription>
                        Sin persona de referencia — la descripción del rol es el
                        benchmark con el que se comparan los CVs.
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.handleSubmit();
                    }}
                    className="space-y-4"
                >
                    <form.Field name="title">
                        {(field) => {
                            const hasError = !field.state.meta.isValid;
                            return (
                                <Field data-invalid={hasError}>
                                    <FieldLabel htmlFor={field.name}>
                                        Título
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        aria-invalid={hasError}
                                    />
                                    {hasError && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="description">
                        {(field) => {
                            const hasError = !field.state.meta.isValid;
                            return (
                                <Field data-invalid={hasError}>
                                    <FieldLabel htmlFor={field.name}>
                                        Descripción del rol
                                    </FieldLabel>
                                    <Textarea
                                        id={field.name}
                                        rows={6}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        aria-invalid={hasError}
                                    />
                                    {hasError && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <DialogFooter>
                        <form.Subscribe selector={(s) => s.canSubmit}>
                            {(canSubmit) => (
                                <Button
                                    type="submit"
                                    disabled={
                                        !canSubmit || createVacancy.isPending
                                    }
                                >
                                    Crear vacante
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

Create `src/core/recruitment/client/ui/vacancy-list.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import type { VacancyListItem } from "@/core/recruitment/domain/types";
import { CreateVacancyModal } from "./create-vacancy-modal";

const STATUS_LABEL: Record<VacancyListItem["status"], string> = {
    open: "Abierta",
    filled: "Cubierta",
    closed: "Cerrada",
};

export function VacancyList({ vacancies }: { vacancies: VacancyListItem[] }) {
    const { slug } = useParams<{ slug: string }>();
    const [creating, setCreating] = useState(false);

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => setCreating(true)}>
                    Nueva vacante
                </Button>
            </div>
            <div className="space-y-2">
                {vacancies.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                        Aún no hay vacantes. Marca la salida de alguien en
                        Personas o crea una manual.
                    </p>
                )}
                {vacancies.map((v) => (
                    <Link
                        key={v.id}
                        href={`/${slug}/app/hiring/${v.id}`}
                        className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                        <div>
                            <div className="font-medium">{v.title}</div>
                            <div className="text-muted-foreground text-sm">
                                {v.candidateCount} candidatos · benchmark{" "}
                                {v.benchmarkType === "person"
                                    ? "por persona"
                                    : "manual"}
                            </div>
                        </div>
                        <Badge
                            variant={v.status === "open" ? "default" : "secondary"}
                        >
                            {STATUS_LABEL[v.status]}
                        </Badge>
                    </Link>
                ))}
            </div>
            {creating && (
                <CreateVacancyModal
                    open
                    onOpenChange={(open) => !open && setCreating(false)}
                />
            )}
        </div>
    );
}
```

Create `src/core/recruitment/client/ui/vacancy-admin-panel.tsx`:

```tsx
"use client";

import { Check, Copy, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import type { Vacancy } from "@/core/recruitment/domain/types";
import { useRecruitment } from "../hooks";

export function VacancyAdminPanel({ vacancy }: { vacancy: Vacancy }) {
    const { useRegenerateToken, useCloseVacancy } = useRecruitment();
    const regenerate = useRegenerateToken(vacancy.id);
    const close = useCloseVacancy(vacancy.id);
    const [copied, setCopied] = useState(false);

    const applyPath = `/apply/${vacancy.publicToken}`;

    const copyLink = async () => {
        await navigator.clipboard.writeText(
            `${window.location.origin}${applyPath}`,
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border p-4">
            <code className="flex-1 truncate text-muted-foreground text-sm">
                {applyPath}
            </code>
            <Button variant="outline" size="sm" onClick={copyLink}>
                {copied ? <Check /> : <Copy />} Copiar link
            </Button>
            <Button
                variant="outline"
                size="sm"
                disabled={regenerate.isPending}
                onClick={() => regenerate.mutate(undefined)}
            >
                <RefreshCw /> Regenerar
            </Button>
            {vacancy.status === "open" && (
                <Button
                    variant="outline"
                    size="sm"
                    disabled={close.isPending}
                    onClick={() => close.mutate(undefined)}
                >
                    <XCircle /> Cerrar vacante
                </Button>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Pages**

Create `src/app/[slug]/app/hiring/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { VacancyList } from "@/core/recruitment/client/ui/vacancy-list";
import { listVacanciesService } from "@/core/recruitment/server/services/list-vacancies-service";
import { resolveResult } from "@/frontend/lib/result";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

const ADMIN_ROLES = new Set(["owner", "admin"]);

export default async function HiringPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { user } = await requireAuth();
    const { slug } = await params;
    const { organization, role } = await requireOrganization(slug, user.id);
    if (!ADMIN_ROLES.has(role)) notFound();

    const vacancies = await resolveResult(
        listVacanciesService(user.id, organization.id),
    );

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
            <div>
                <h1 className="font-semibold text-xl">Contratación</h1>
                <p className="text-muted-foreground text-sm">
                    Vacantes abiertas y sus candidatos rankeados contra el
                    conocimiento del rol.
                </p>
            </div>
            <VacancyList vacancies={vacancies} />
        </div>
    );
}
```

Create `src/app/[slug]/app/hiring/error.tsx` (copy the sibling `documents/error.tsx` verbatim, adjust heading).

Create `src/app/[slug]/app/hiring/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { VacancyAdminPanel } from "@/core/recruitment/client/ui/vacancy-admin-panel";
import { getVacancyService } from "@/core/recruitment/server/services/get-vacancy-service";
import { resolveResult } from "@/frontend/lib/result";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/** Vacancy detail shell — the ranked candidate list lands in Task 12. */
export default async function VacancyDetailPage({
    params,
}: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const { user } = await requireAuth();
    const { slug, id } = await params;
    const { organization, role } = await requireOrganization(slug, user.id);
    if (!ADMIN_ROLES.has(role)) notFound();

    const vacancy = await resolveResult(
        getVacancyService(user.id, organization.id, id),
    );

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
            <div>
                <h1 className="font-semibold text-xl">{vacancy.title}</h1>
                <p className="text-muted-foreground text-sm">
                    Benchmark{" "}
                    {vacancy.benchmarkType === "person"
                        ? "del conocimiento de la persona que salió"
                        : "de la descripción manual"}
                    .
                </p>
            </div>
            <VacancyAdminPanel vacancy={vacancy} />
        </div>
    );
}
```

- [ ] **Step 5: Verify + commit**

Run: `pnpm typecheck && pnpm check`
Expected: clean (fix import order with `pnpm check:fix` if biome flags it).

```bash
git add src/core/recruitment src/app/[slug]/app/hiring
git commit -m "feat(recruitment): vacancy routes + hiring UI"
```

---

### Task 10: CV intake — parse seam, apply service, public route + apply page

**Files:**
- Create: `src/core/recruitment/server/llm/parse-cv.ts`
- Create: `src/core/recruitment/server/repository/candidates.ts`
- Create: `src/core/recruitment/server/services/apply-to-vacancy-service.ts`
- Create: `src/core/recruitment/server/api/routes/apply.route.ts`
- Modify: `src/core/recruitment/server/api/router.ts`
- Create: `src/app/apply/[token]/page.tsx`
- Create: `src/core/recruitment/client/ui/apply-form.tsx`
- Test: `src/core/recruitment/server/services/__tests__/apply-to-vacancy-service.test.ts`

**Interfaces:**
- Consumes: `findVacancyByToken`, `countCandidates` (Task 5 repo); `candidateProfileSchema`, `applyInputSchema`, `MAX_CV_BYTES`, `MAX_CANDIDATES_PER_VACANCY` (Task 2).
- Produces:
  - `ParseCvFn = (pdf: Uint8Array) => Promise<CandidateProfile>` (+ `googleParseCv` prod binding).
  - `insertCandidate(row: NewCandidateRow): Promise<CandidateRow>`, `findCandidateByEmail(vacancyId: string, email: string): Promise<CandidateRow | null>`.
  - `applyToVacancyService(input: ApplyInput, deps?: { parseCv?: ParseCvFn }): AsyncAppResult<{ received: true }>`.
  - `getPublicVacancyService(token: string): AsyncAppResult<PublicVacancy>` (in this task's files below — used by the RSC page).
  - Public route `POST /api/v1/recruitment/apply/:token`.

- [ ] **Step 1: Write the failing test**

Create `src/core/recruitment/server/services/__tests__/apply-to-vacancy-service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../repository/vacancies", () => ({
    findVacancyByToken: vi.fn(),
    countCandidates: vi.fn(),
}));
vi.mock("../../repository/candidates", () => ({
    findCandidateByEmail: vi.fn(),
    insertCandidate: vi.fn(),
}));

import type { CandidateProfile } from "@/core/recruitment/domain/types";
import type {
    CandidateRow,
    VacancyRow,
} from "@/server/drizzle/schemas/recruitment-schema";
import {
    findCandidateByEmail,
    insertCandidate,
} from "../../repository/candidates";
import {
    countCandidates,
    findVacancyByToken,
} from "../../repository/vacancies";
import type { ParseCvFn } from "../../llm/parse-cv";
import { applyToVacancyService } from "../apply-to-vacancy-service";

const TOKEN = "t".repeat(64);

const vacancyRow = (over: Partial<VacancyRow> = {}): VacancyRow & {
    organizationName: string;
} => ({
    id: "v1",
    organizationId: "org1",
    title: "Backend Senior",
    benchmarkType: "person",
    manualDescription: null,
    publicToken: TOKEN,
    status: "open",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    organizationName: "Acme",
    ...over,
});

const profile: CandidateProfile = {
    plainText: "CV de Ana...",
    summary: "Backend dev",
    skills: ["postgres", "typescript"],
    yearsOfExperience: 5,
    experience: [{ role: "Dev", company: "X", summary: "apis" }],
};

const fakeParse: ParseCvFn = async () => profile;

const input = {
    token: TOKEN,
    name: "Ana",
    email: "ana@x.com",
    cv: {
        data: new Uint8Array([1, 2, 3]),
        filename: "cv.pdf",
        mediaType: "application/pdf" as const,
    },
};

describe("applyToVacancyService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(findVacancyByToken).mockResolvedValue(vacancyRow());
        vi.mocked(countCandidates).mockResolvedValue(0);
        vi.mocked(findCandidateByEmail).mockResolvedValue(null);
        vi.mocked(insertCandidate).mockImplementation(
            async (row) => row as CandidateRow,
        );
    });

    it("silently accepts honeypot submissions without inserting", async () => {
        const result = await applyToVacancyService(
            { ...input, website: "http://spam" },
            { parseCv: fakeParse },
        );
        expect(result.ok).toBe(true);
        expect(insertCandidate).not.toHaveBeenCalled();
    });

    it("404s identically for unknown token and closed vacancy", async () => {
        vi.mocked(findVacancyByToken).mockResolvedValue(null);
        const unknown = await applyToVacancyService(input, {
            parseCv: fakeParse,
        });
        expect(unknown.ok).toBe(false);
        if (!unknown.ok) expect(unknown.error.status).toBe(404);

        vi.mocked(findVacancyByToken).mockResolvedValue(
            vacancyRow({ status: "closed" }),
        );
        const closed = await applyToVacancyService(input, {
            parseCv: fakeParse,
        });
        expect(closed.ok).toBe(false);
        if (!closed.ok) expect(closed.error.status).toBe(404);
    });

    it("429s when the vacancy is full", async () => {
        vi.mocked(countCandidates).mockResolvedValue(200);
        const result = await applyToVacancyService(input, {
            parseCv: fakeParse,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(429);
    });

    it("conflicts on duplicate email per vacancy", async () => {
        vi.mocked(findCandidateByEmail).mockResolvedValue({} as CandidateRow);
        const result = await applyToVacancyService(input, {
            parseCv: fakeParse,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("CONFLICT");
    });

    it("422s when the CV cannot be parsed", async () => {
        const result = await applyToVacancyService(input, {
            parseCv: async () => {
                throw new Error("unreadable");
            },
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(422);
        expect(insertCandidate).not.toHaveBeenCalled();
    });

    it("stores the candidate as pending with the parsed profile", async () => {
        const result = await applyToVacancyService(input, {
            parseCv: fakeParse,
        });
        expect(result.ok).toBe(true);

        const inserted = vi.mocked(insertCandidate).mock.calls[0][0];
        expect(inserted.vacancyId).toBe("v1");
        expect(inserted.email).toBe("ana@x.com");
        expect(inserted.cvText).toBe("CV de Ana...");
        expect(inserted.profile).toEqual(profile);
        expect(inserted.status).toBe("pending");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/core/recruitment/server/services/__tests__/apply-to-vacancy-service.test.ts`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Implement**

Create `src/core/recruitment/server/llm/parse-cv.ts`:

```ts
import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { ServerConfig } from "@/config/server-config";
import { candidateProfileSchema } from "@/core/recruitment/domain/schemas";
import type { CandidateProfile } from "@/core/recruitment/domain/types";

export const CV_PARSE_MODEL = "gemini-2.5-flash";

/**
 * The CV-parse seam: turn a PDF into a structured profile. Services depend on
 * this type, not the model — tests inject a deterministic fake.
 */
export type ParseCvFn = (pdf: Uint8Array) => Promise<CandidateProfile>;

const SYSTEM_PROMPT = `You extract a structured profile from a candidate's CV (PDF attached).
- plainText: the full cleaned plain-text content of the CV (no layout artifacts).
- summary: 2-3 sentences on who this candidate is professionally.
- skills: concrete technologies/domains (not soft adjectives).
- yearsOfExperience: total professional years, or null if unclear.
- experience: each relevant job with role, company, and a 1-sentence summary.
Use the CV's own language.`;

const google = createGoogleGenerativeAI({ apiKey: ServerConfig.googleApiKey });

export const googleParseCv: ParseCvFn = async (pdf) => {
    const { output } = await generateText({
        model: google(CV_PARSE_MODEL),
        output: Output.object({ schema: candidateProfileSchema }),
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: SYSTEM_PROMPT },
                    { type: "file", data: pdf, mediaType: "application/pdf" },
                ],
            },
        ],
    });
    return output;
};
```

Create `src/core/recruitment/server/repository/candidates.ts`:

```ts
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    candidate,
    type CandidateRow,
    type NewCandidateRow,
} from "@/server/drizzle/schemas/recruitment-schema";

export async function insertCandidate(
    row: NewCandidateRow,
): Promise<CandidateRow> {
    const [inserted] = await db.insert(candidate).values(row).returning();
    return inserted;
}

export async function findCandidateByEmail(
    vacancyId: string,
    email: string,
): Promise<CandidateRow | null> {
    const [row] = await db
        .select()
        .from(candidate)
        .where(and(eq(candidate.vacancyId, vacancyId), eq(candidate.email, email)))
        .limit(1);
    return row ?? null;
}
```

Create `src/core/recruitment/server/services/apply-to-vacancy-service.ts`:

```ts
import "server-only";
import {
    applyInputSchema,
    MAX_CANDIDATES_PER_VACANCY,
    MAX_CV_BYTES,
} from "@/core/recruitment/domain/schemas";
import type { ApplyInput } from "@/core/recruitment/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { googleParseCv, type ParseCvFn } from "../llm/parse-cv";
import {
    findCandidateByEmail,
    insertCandidate,
} from "../repository/candidates";
import {
    countCandidates,
    findVacancyByToken,
} from "../repository/vacancies";

export interface ApplyDeps {
    parseCv?: ParseCvFn;
}

/**
 * Public application intake. Deliberately leak-free: unknown token and closed
 * vacancy are the same 404; honeypot submissions are accepted silently and
 * dropped. The candidate row is stored `pending` — Task 11 wires the
 * automatic analysis right after this succeeds.
 */
export async function applyToVacancyService(
    rawInput: ApplyInput,
    deps: ApplyDeps = {},
): AsyncAppResult<{ received: true }> {
    const parseCv = deps.parseCv ?? googleParseCv;

    const parsed = applyInputSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(AppErrors.invalidBody({ cause: parsed.error }));
    }
    const input = parsed.data;

    try {
        // Honeypot: pretend success, store nothing.
        if (input.website !== undefined) return ok({ received: true });

        if (input.cv.data.byteLength > MAX_CV_BYTES) {
            return err(AppErrors.unprocessableEntity({ targets: ["cv"] }));
        }

        const vacancy = await findVacancyByToken(input.token);
        if (!vacancy || vacancy.status !== "open") {
            return err(AppErrors.notFound());
        }

        const total = await countCandidates(vacancy.id);
        if (total >= MAX_CANDIDATES_PER_VACANCY) {
            return err(AppErrors.tooManyRequests());
        }

        const duplicate = await findCandidateByEmail(vacancy.id, input.email);
        if (duplicate) {
            return err(AppErrors.conflict({ targets: ["email"] }));
        }

        let profile;
        try {
            profile = await parseCv(input.cv.data);
        } catch (cause) {
            return err(
                AppErrors.unprocessableEntity({ targets: ["cv"], cause }),
            );
        }

        await insertCandidate({
            vacancyId: vacancy.id,
            name: input.name,
            email: input.email,
            cvFilename: input.cv.filename,
            cvText: profile.plainText,
            profile,
            status: "pending",
        });

        return ok({ received: true });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

Create `src/core/recruitment/server/services/get-public-vacancy-service.ts`:

```ts
import "server-only";
import type { PublicVacancy } from "@/core/recruitment/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findVacancyByToken } from "../repository/vacancies";

/** Public-safe vacancy read for the apply portal (title + org name only). */
export async function getPublicVacancyService(
    token: string,
): AsyncAppResult<PublicVacancy> {
    try {
        const row = await findVacancyByToken(token);
        if (!row || row.status !== "open") {
            return err(AppErrors.notFound());
        }
        return ok({
            title: row.title,
            organizationName: row.organizationName,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

Create `src/core/recruitment/server/api/routes/apply.route.ts`:

```ts
import { Elysia, t } from "elysia";
import { z } from "zod";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { applyToVacancyService } from "../../services/apply-to-vacancy-service";

const applyResultSchema = z.object({ received: z.literal(true) });

/**
 * Public application endpoint — the one route in the project without
 * `authed` (like the Notion OAuth callback). Multipart body is validated
 * with Elysia `t` (zod cannot represent `File` under the global OpenAPI
 * zod mapping); the service re-validates everything with `applyInputSchema`.
 */
export const applyRoute = new Elysia().post(
    "/apply/:token",
    async ({ params, body, status }) => {
        const result = await applyToVacancyService({
            token: params.token,
            name: body.name,
            email: body.email,
            cv: {
                data: new Uint8Array(await body.cv.arrayBuffer()),
                filename: body.cv.name,
                mediaType: "application/pdf",
            },
            website: body.website === "" ? undefined : body.website,
        });
        if (!result.ok)
            return status(
                result.error.status as 400 | 404 | 409 | 422 | 429 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        body: t.Object({
            name: t.String({ minLength: 1, maxLength: 200 }),
            email: t.String({ format: "email" }),
            cv: t.File({ type: "application/pdf" }),
            website: t.Optional(t.String()),
        }),
        params: z.object({ token: z.string() }),
        response: {
            200: successResponseSchema(applyResultSchema, "ApplyResult"),
            400: errorResponseSchema(400),
            404: errorResponseSchema(404),
            409: errorResponseSchema(409),
            422: errorResponseSchema(422),
            429: errorResponseSchema(429),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "Public: submit a CV to a vacancy",
        },
    },
);
```

Update `src/core/recruitment/server/api/router.ts` — add:

```ts
import { applyRoute } from "./routes/apply.route";
// ...inside the chain:
    .use(applyRoute);
```

- [ ] **Step 4: Apply page + form**

Create `src/app/apply/[token]/page.tsx`:

```tsx
import { ApplyForm } from "@/core/recruitment/client/ui/apply-form";
import { getPublicVacancyService } from "@/core/recruitment/server/services/get-public-vacancy-service";

export const dynamic = "force-dynamic";

/** Public apply portal — outside the app shell, no session required. */
export default async function ApplyPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const result = await getPublicVacancyService(token);

    return (
        <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center p-6">
            {result.ok ? (
                <div className="space-y-6">
                    <div className="space-y-1">
                        <p className="text-muted-foreground text-sm">
                            {result.data.organizationName}
                        </p>
                        <h1 className="font-semibold text-2xl">
                            {result.data.title}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Sube tu CV en PDF y postúlate.
                        </p>
                    </div>
                    <ApplyForm token={token} />
                </div>
            ) : (
                <div className="space-y-2 text-center">
                    <h1 className="font-semibold text-xl">
                        Vacante no disponible
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Este link no es válido o la vacante ya no acepta
                        aplicaciones.
                    </p>
                </div>
            )}
        </main>
    );
}
```

Create `src/core/recruitment/client/ui/apply-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/frontend/components/ui/field";
import { Input } from "@/frontend/components/ui/input";

type SubmitState =
    | { kind: "idle" }
    | { kind: "submitting" }
    | { kind: "done" }
    | { kind: "error"; message: string };

/**
 * Plain fetch + FormData (multipart) — the Eden proxy is for authed app
 * routes; this public endpoint takes a file, so a native form post is the
 * simple correct tool. The `website` field is a honeypot: invisible to
 * humans, irresistible to bots.
 */
export function ApplyForm({ token }: { token: string }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [cv, setCv] = useState<File | null>(null);
    const [website, setWebsite] = useState("");
    const [state, setState] = useState<SubmitState>({ kind: "idle" });

    if (state.kind === "done") {
        return (
            <div className="rounded-lg border p-6 text-center">
                <p className="font-medium">¡Aplicación recibida!</p>
                <p className="text-muted-foreground text-sm">
                    Gracias por postularte. Te contactaremos pronto.
                </p>
            </div>
        );
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cv) return;
        setState({ kind: "submitting" });

        const form = new FormData();
        form.set("name", name);
        form.set("email", email);
        form.set("cv", cv);
        form.set("website", website);

        try {
            const res = await fetch(`/api/v1/recruitment/apply/${token}`, {
                method: "POST",
                body: form,
            });
            if (res.ok) {
                setState({ kind: "done" });
                return;
            }
            const message =
                res.status === 409
                    ? "Ya existe una aplicación con este email para esta vacante."
                    : res.status === 422
                      ? "No pudimos leer tu CV. Intenta con otro PDF."
                      : res.status === 429
                        ? "Esta vacante ya no acepta más aplicaciones."
                        : "No pudimos procesar tu aplicación. Intenta de nuevo.";
            setState({ kind: "error", message });
        } catch {
            setState({
                kind: "error",
                message: "Error de red. Intenta de nuevo.",
            });
        }
    };

    const ready = name.trim() !== "" && email.trim() !== "" && cv !== null;

    return (
        <form onSubmit={submit} className="space-y-4">
            <Field>
                <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </Field>
            <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </Field>
            <Field>
                <FieldLabel htmlFor="cv">CV (PDF, máx. 5 MB)</FieldLabel>
                <Input
                    id="cv"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setCv(e.target.files?.[0] ?? null)}
                    required
                />
            </Field>
            {/* Honeypot — keep out of sight and out of the tab order. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="website">Website</label>
                <input
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                />
            </div>
            {state.kind === "error" && <FieldError>{state.message}</FieldError>}
            <Button
                type="submit"
                disabled={!ready || state.kind === "submitting"}
                className="w-full"
            >
                {state.kind === "submitting" ? "Enviando…" : "Enviar aplicación"}
            </Button>
        </form>
    );
}
```

- [ ] **Step 5: Run test + verify**

Run: `pnpm vitest run src/core/recruitment/server/services/__tests__/apply-to-vacancy-service.test.ts && pnpm typecheck && pnpm check`
Expected: 6 tests PASS; typecheck/check clean.

- [ ] **Step 6: Commit**

```bash
git add src/core/recruitment src/app/apply
git commit -m "feat(recruitment): public apply portal with CV intake"
```

---

### Task 11: Analysis — LLM seam, analyze service, retry/delete, ranked list

**Files:**
- Create: `src/core/recruitment/server/llm/analyze.ts`
- Create: `src/core/recruitment/server/repository/analyses.ts`
- Modify: `src/core/recruitment/server/repository/candidates.ts` (add 5 fns)
- Create: `src/core/recruitment/server/services/analyze-candidate-service.ts`
- Create: `src/core/recruitment/server/services/retry-analysis-service.ts`
- Create: `src/core/recruitment/server/services/delete-candidate-service.ts`
- Create: `src/core/recruitment/server/services/list-candidates-service.ts`
- Modify: `src/core/recruitment/server/services/apply-to-vacancy-service.ts` (wire analysis)
- Modify: `src/core/recruitment/server/services/__tests__/apply-to-vacancy-service.test.ts` (analysis flow)
- Create: `src/core/recruitment/server/api/routes/list-candidates.route.ts`
- Create: `src/core/recruitment/server/api/routes/retry-analysis.route.ts`
- Create: `src/core/recruitment/server/api/routes/delete-candidate.route.ts`
- Modify: `src/core/recruitment/server/api/router.ts`
- Test: `src/core/recruitment/server/services/__tests__/analyze-candidate-service.test.ts`
- Test: `src/core/recruitment/server/services/__tests__/candidate-admin-services.test.ts`

**Interfaces:**
- Consumes: `searchKnowledgeService` (`@/core/knowledge/server/services/search-knowledge-service`) and its `EmbedFn` seam type (`@/core/knowledge/server/embeddings/embed`) — cross-domain service reuse, deliberate: retrieval stays single-sourced in knowledge.
- Produces:
  - `AnalyzeBenchmarkFn = (input: AnalyzeInput) => Promise<AnalysisOutput>`; `AnalyzeInput = { vacancyTitle: string; benchmark: string; profile: CandidateProfile }`.
  - `analyzeCandidateService(candidateId: string, deps?: AnalyzeDeps): AsyncAppResult<Analysis>` — no admin gate (internal); gates live in `retryAnalysisService` / the public apply path.
  - `retryAnalysisService(userId, organizationId, candidateId): AsyncAppResult<Analysis>`
  - `deleteCandidateService(userId, organizationId, candidateId): AsyncAppResult<{ deleted: true }>`
  - `listCandidatesService(userId, organizationId, vacancyId): AsyncAppResult<RankedCandidate[]>`
  - Candidate repo additions: `findCandidateWithVacancy(candidateId): Promise<{ candidate: CandidateRow; vacancy: VacancyRow } | null>`, `setCandidateStatus(id, status): Promise<void>`, `listCandidatesWithAnalysis(vacancyId): Promise<{ candidate: CandidateRow; analysis: AnalysisRow | null }[]>`, `deleteCandidate(id): Promise<boolean>`.
  - Analysis repo: `upsertAnalysis(row: NewAnalysisRow): Promise<AnalysisRow>`.

- [ ] **Step 1: Write the failing tests**

Create `src/core/recruitment/server/services/__tests__/analyze-candidate-service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/knowledge/server/services/search-knowledge-service", () => ({
    searchKnowledgeService: vi.fn(),
}));
vi.mock("../../repository/candidates", () => ({
    findCandidateWithVacancy: vi.fn(),
    setCandidateStatus: vi.fn(),
}));
vi.mock("../../repository/analyses", () => ({ upsertAnalysis: vi.fn() }));

import { searchKnowledgeService } from "@/core/knowledge/server/services/search-knowledge-service";
import type {
    AnalysisOutput,
    CandidateProfile,
} from "@/core/recruitment/domain/types";
import type {
    AnalysisRow,
    CandidateRow,
    VacancyRow,
} from "@/server/drizzle/schemas/recruitment-schema";
import { upsertAnalysis } from "../../repository/analyses";
import {
    findCandidateWithVacancy,
    setCandidateStatus,
} from "../../repository/candidates";
import type { AnalyzeBenchmarkFn } from "../../llm/analyze";
import { analyzeCandidateService } from "../analyze-candidate-service";

const profile: CandidateProfile = {
    plainText: "CV de Ana",
    summary: "Backend dev",
    skills: ["postgres"],
    yearsOfExperience: 5,
    experience: [],
};

const candidateRow = (over: Partial<CandidateRow> = {}): CandidateRow => ({
    id: "c1",
    vacancyId: "v1",
    name: "Ana",
    email: "ana@x.com",
    cvFilename: "cv.pdf",
    cvText: "CV de Ana",
    profile,
    status: "pending",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const vacancyRow = (over: Partial<VacancyRow> = {}): VacancyRow => ({
    id: "v1",
    organizationId: "org1",
    title: "Backend Senior",
    benchmarkType: "manual",
    manualDescription: "Postgres + APIs",
    publicToken: "t".repeat(64),
    status: "open",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const output: AnalysisOutput = {
    score: 81,
    dimensions: [
        { name: "Procesos", score: 80, strengths: ["s"], gaps: ["g"] },
        { name: "Dominio", score: 82, strengths: [], gaps: [] },
        { name: "Criterio", score: 81, strengths: ["x"], gaps: [] },
    ],
    summary: "Buen fit",
    interviewQuestions: ["q1", "q2", "q3"],
};

const fakeAnalyze: AnalyzeBenchmarkFn = async () => output;

describe("analyzeCandidateService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(upsertAnalysis).mockImplementation(
            async (row) => row as AnalysisRow,
        );
    });

    it("uses the manual description as benchmark without touching retrieval", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: candidateRow(),
            vacancy: vacancyRow({ benchmarkType: "manual" }),
        });

        const result = await analyzeCandidateService("c1", {
            analyze: fakeAnalyze,
        });

        expect(searchKnowledgeService).not.toHaveBeenCalled();
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data.score).toBe(81);
        expect(setCandidateStatus).toHaveBeenCalledWith("c1", "analyzed");
    });

    it("builds the person benchmark from retrieval scoped to the vacancy id", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: candidateRow(),
            vacancy: vacancyRow({
                id: "member-1",
                benchmarkType: "person",
                manualDescription: null,
            }),
        });
        vi.mocked(searchKnowledgeService).mockResolvedValue({
            ok: true,
            data: {
                query: "Backend Senior",
                chunks: [
                    {
                        id: "ch1",
                        documentId: "d1",
                        personId: "member-1",
                        content: "migré la API a Postgres",
                        ord: 0,
                        score: 0.9,
                    },
                ],
                nodes: [
                    {
                        id: "n1",
                        personId: "member-1",
                        type: "decision",
                        label: "Usar Postgres",
                        summary: "integridad relacional",
                        sourceChunkId: null,
                        origin: "sync",
                        confidence: 1,
                        createdAt: "2026-01-01T00:00:00.000Z",
                        score: 0.8,
                    },
                ],
                edges: [],
            },
        });

        const analyzeSpy = vi.fn<AnalyzeBenchmarkFn>().mockResolvedValue(output);
        const result = await analyzeCandidateService("c1", {
            analyze: analyzeSpy,
        });

        expect(searchKnowledgeService).toHaveBeenCalledWith(
            "org1",
            expect.objectContaining({
                query: "Backend Senior",
                personId: "member-1",
            }),
            expect.anything(),
        );
        const benchmark = analyzeSpy.mock.calls[0][0].benchmark;
        expect(benchmark).toContain("Usar Postgres");
        expect(benchmark).toContain("migré la API a Postgres");
        expect(result.ok).toBe(true);
    });

    it("marks the candidate failed when the LLM blows up", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: candidateRow(),
            vacancy: vacancyRow(),
        });

        const result = await analyzeCandidateService("c1", {
            analyze: async () => {
                throw new Error("model down");
            },
        });

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
        expect(setCandidateStatus).toHaveBeenCalledWith("c1", "failed");
        expect(upsertAnalysis).not.toHaveBeenCalled();
    });

    it("404s on unknown candidate", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue(null);
        const result = await analyzeCandidateService("ghost", {
            analyze: fakeAnalyze,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(404);
    });
});
```

Create `src/core/recruitment/server/services/__tests__/candidate-admin-services.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("../../repository/candidates", () => ({
    findCandidateWithVacancy: vi.fn(),
    setCandidateStatus: vi.fn(),
    listCandidatesWithAnalysis: vi.fn(),
    deleteCandidate: vi.fn(),
}));
vi.mock("../../repository/analyses", () => ({ upsertAnalysis: vi.fn() }));
vi.mock("../../repository/vacancies", () => ({ findVacancyById: vi.fn() }));
vi.mock(
    "@/core/knowledge/server/services/search-knowledge-service",
    () => ({ searchKnowledgeService: vi.fn() }),
);

import type { CandidateProfile } from "@/core/recruitment/domain/types";
import type {
    AnalysisRow,
    CandidateRow,
    VacancyRow,
} from "@/server/drizzle/schemas/recruitment-schema";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import { upsertAnalysis } from "../../repository/analyses";
import {
    deleteCandidate,
    findCandidateWithVacancy,
    listCandidatesWithAnalysis,
    setCandidateStatus,
} from "../../repository/candidates";
import { findVacancyById } from "../../repository/vacancies";
import { deleteCandidateService } from "../delete-candidate-service";
import { listCandidatesService } from "../list-candidates-service";
import { retryAnalysisService } from "../retry-analysis-service";

const ORG = "org1";
const ADMIN = "admin-user";

const profile: CandidateProfile = {
    plainText: "cv",
    summary: "s",
    skills: [],
    yearsOfExperience: null,
    experience: [],
};

const candidateRow = (over: Partial<CandidateRow> = {}): CandidateRow => ({
    id: "c1",
    vacancyId: "v1",
    name: "Ana",
    email: "ana@x.com",
    cvFilename: "cv.pdf",
    cvText: "cv",
    profile,
    status: "failed",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const vacancyRow = (over: Partial<VacancyRow> = {}): VacancyRow => ({
    id: "v1",
    organizationId: ORG,
    title: "Backend",
    benchmarkType: "manual",
    manualDescription: "desc",
    publicToken: "t".repeat(64),
    status: "open",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const analysisRow = (over: Partial<AnalysisRow> = {}): AnalysisRow => ({
    candidateId: "c1",
    score: 77,
    dimensions: [],
    summary: "ok",
    interviewQuestions: ["q"],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

describe("candidate admin services", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "owner" });
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: candidateRow(),
            vacancy: vacancyRow(),
        });
        vi.mocked(findVacancyById).mockResolvedValue(vacancyRow());
        vi.mocked(upsertAnalysis).mockImplementation(
            async (row) => row as AnalysisRow,
        );
    });

    it("retries analysis for a failed candidate (admin)", async () => {
        const result = await retryAnalysisService(ADMIN, ORG, "c1", {
            analyze: async () => ({
                score: 77,
                dimensions: [
                    { name: "a", score: 1, strengths: [], gaps: [] },
                    { name: "b", score: 2, strengths: [], gaps: [] },
                    { name: "c", score: 3, strengths: [], gaps: [] },
                ],
                summary: "ok",
                interviewQuestions: ["q1", "q2", "q3"],
            }),
        });
        expect(result.ok).toBe(true);
        expect(setCandidateStatus).toHaveBeenCalledWith("c1", "analyzed");
    });

    it("forbids retry for non-admins", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "member" });
        const result = await retryAnalysisService("u2", ORG, "c1");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(403);
    });

    it("lists candidates ranked by score, unanalyzed last", async () => {
        vi.mocked(listCandidatesWithAnalysis).mockResolvedValue([
            { candidate: candidateRow({ id: "c-low" }), analysis: analysisRow({ candidateId: "c-low", score: 40 }) },
            { candidate: candidateRow({ id: "c-top" }), analysis: analysisRow({ candidateId: "c-top", score: 95 }) },
            { candidate: candidateRow({ id: "c-pending", status: "pending" }), analysis: null },
        ]);

        const result = await listCandidatesService(ADMIN, ORG, "v1");
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.map((r) => r.candidate.id)).toEqual([
            "c-top",
            "c-low",
            "c-pending",
        ]);
        expect(result.data[2].analysis).toBeNull();
    });

    it("404s list when the vacancy belongs to another org", async () => {
        vi.mocked(findVacancyById).mockResolvedValue(null);
        const result = await listCandidatesService(ADMIN, ORG, "ghost");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(404);
    });

    it("deletes a candidate (and its analysis via cascade)", async () => {
        vi.mocked(deleteCandidate).mockResolvedValue(true);
        const result = await deleteCandidateService(ADMIN, ORG, "c1");
        expect(result.ok).toBe(true);
        expect(deleteCandidate).toHaveBeenCalledWith("c1");
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/core/recruitment/server/services/__tests__/analyze-candidate-service.test.ts src/core/recruitment/server/services/__tests__/candidate-admin-services.test.ts`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Implement the LLM seam**

Create `src/core/recruitment/server/llm/analyze.ts`:

```ts
import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { ServerConfig } from "@/config/server-config";
import { analysisOutputSchema } from "@/core/recruitment/domain/schemas";
import type {
    AnalysisOutput,
    CandidateProfile,
} from "@/core/recruitment/domain/types";

export const ANALYSIS_MODEL = "gemini-2.5-flash";

export interface AnalyzeInput {
    vacancyTitle: string;
    /** The role benchmark: knowledge digest (person) or manual description. */
    benchmark: string;
    profile: CandidateProfile;
}

/** The analysis seam — tests inject a deterministic fake. */
export type AnalyzeBenchmarkFn = (
    input: AnalyzeInput,
) => Promise<AnalysisOutput>;

const SYSTEM_PROMPT = `You evaluate a candidate against the real benchmark of a role inside one company.
The benchmark is either the captured knowledge of the person who held the role
(their decisions, processes, concepts) or a manual role description.

Score the fit 0-100 and break it into 3-6 dimensions (e.g. processes, domain,
seniority of judgment). Each dimension: name, score 0-100, strengths, gaps —
always grounded in the benchmark vs the CV, never invented. Then a 2-3 sentence
summary and 5-8 interview questions that probe the gaps.
Answer in the language of the benchmark.`;

const google = createGoogleGenerativeAI({ apiKey: ServerConfig.googleApiKey });

export const googleAnalyzeBenchmark: AnalyzeBenchmarkFn = async (input) => {
    const { output } = await generateText({
        model: google(ANALYSIS_MODEL),
        output: Output.object({ schema: analysisOutputSchema }),
        system: SYSTEM_PROMPT,
        prompt: [
            `Role: ${input.vacancyTitle}`,
            "",
            "=== ROLE BENCHMARK ===",
            input.benchmark,
            "",
            "=== CANDIDATE PROFILE ===",
            `Summary: ${input.profile.summary}`,
            `Skills: ${input.profile.skills.join(", ")}`,
            `Years of experience: ${input.profile.yearsOfExperience ?? "unknown"}`,
            "",
            "=== CV TEXT ===",
            input.profile.plainText.slice(0, 20_000),
        ].join("\n"),
    });
    return output;
};
```

- [ ] **Step 4: Implement repositories**

Create `src/core/recruitment/server/repository/analyses.ts`:

```ts
import "server-only";
import { db } from "@/server/drizzle/db";
import {
    analysis,
    type AnalysisRow,
    type NewAnalysisRow,
} from "@/server/drizzle/schemas/recruitment-schema";

export async function upsertAnalysis(
    row: NewAnalysisRow,
): Promise<AnalysisRow> {
    const [saved] = await db
        .insert(analysis)
        .values(row)
        .onConflictDoUpdate({
            target: analysis.candidateId,
            set: {
                score: row.score,
                dimensions: row.dimensions,
                summary: row.summary,
                interviewQuestions: row.interviewQuestions,
            },
        })
        .returning();
    return saved;
}
```

Append to `src/core/recruitment/server/repository/candidates.ts`:

```ts
import { desc, isNull, sql } from "drizzle-orm";
import {
    analysis,
    type AnalysisRow,
    vacancy,
    type VacancyRow,
} from "@/server/drizzle/schemas/recruitment-schema";
import type { CandidateStatus } from "@/core/recruitment/domain/types";

/** Candidate joined to its vacancy — the org/benchmark scoping read. */
export async function findCandidateWithVacancy(
    candidateId: string,
): Promise<{ candidate: CandidateRow; vacancy: VacancyRow } | null> {
    const [row] = await db
        .select({ candidate, vacancy })
        .from(candidate)
        .innerJoin(vacancy, eq(candidate.vacancyId, vacancy.id))
        .where(eq(candidate.id, candidateId))
        .limit(1);
    return row ?? null;
}

export async function setCandidateStatus(
    id: string,
    status: CandidateStatus,
): Promise<void> {
    await db.update(candidate).set({ status }).where(eq(candidate.id, id));
}

/** Score desc, unanalyzed last — the ranking read. */
export async function listCandidatesWithAnalysis(
    vacancyId: string,
): Promise<{ candidate: CandidateRow; analysis: AnalysisRow | null }[]> {
    return db
        .select({ candidate, analysis })
        .from(candidate)
        .leftJoin(analysis, eq(analysis.candidateId, candidate.id))
        .where(eq(candidate.vacancyId, vacancyId))
        .orderBy(
            sql`${analysis.score} DESC NULLS LAST`,
            desc(candidate.createdAt),
        );
}

export async function deleteCandidate(id: string): Promise<boolean> {
    const deleted = await db
        .delete(candidate)
        .where(eq(candidate.id, id))
        .returning({ id: candidate.id });
    return deleted.length > 0;
}
```

(Move the new drizzle imports into the file's existing import block per biome import order; drop the unused `isNull` import if flagged — `pnpm check:fix` handles it.)

- [ ] **Step 5: Implement services**

Create `src/core/recruitment/server/services/analyze-candidate-service.ts`:

```ts
import "server-only";
import { searchKnowledgeService } from "@/core/knowledge/server/services/search-knowledge-service";
import type { EmbedFn } from "@/core/knowledge/server/embeddings/embed";
import type { Analysis } from "@/core/recruitment/domain/types";
import type { VacancyRow } from "@/server/drizzle/schemas/recruitment-schema";
import {
    AppErrors,
    type AppResult,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    type AnalyzeBenchmarkFn,
    googleAnalyzeBenchmark,
} from "../llm/analyze";
import { upsertAnalysis } from "../repository/analyses";
import {
    findCandidateWithVacancy,
    setCandidateStatus,
} from "../repository/candidates";
import { toAnalysis } from "../repository/utils";

export interface AnalyzeDeps {
    analyze?: AnalyzeBenchmarkFn;
    embed?: EmbedFn;
}

/**
 * Build the role benchmark. Person-born vacancies digest the departed
 * person's knowledge via the existing hybrid retrieval — scoped to
 * `personId = vacancy.id` (the member id, preserved by the offboarding
 * flip). Manual vacancies use their description verbatim.
 */
async function buildBenchmark(
    vacancy: VacancyRow,
    deps: AnalyzeDeps,
): Promise<AppResult<string>> {
    if (vacancy.benchmarkType === "manual") {
        return ok(vacancy.manualDescription ?? "");
    }

    const search = await searchKnowledgeService(
        vacancy.organizationId,
        {
            query: vacancy.title,
            personId: vacancy.id,
            limit: 12,
            hops: 1,
        },
        { embed: deps.embed },
    );
    if (!search.ok) return err(search.error);

    const nodes = search.data.nodes
        .map((n) => `- ${n.type}: ${n.label}${n.summary ? ` — ${n.summary}` : ""}`)
        .join("\n");
    const chunks = search.data.chunks
        .map((c) => `- ${c.content}`)
        .join("\n");
    const digest = [
        nodes ? `Decisions, processes and concepts:\n${nodes}` : "",
        chunks ? `\nSource excerpts:\n${chunks}` : "",
    ]
        .filter(Boolean)
        .join("\n");

    return ok(
        digest ||
            "(No captured knowledge for this person yet — evaluate against the role title only.)",
    );
}

/**
 * Compare one candidate against the vacancy benchmark and persist the
 * analysis. Never loses the application: any failure marks the candidate
 * `failed` (HR can retry) instead of bubbling up to the public applicant.
 */
export async function analyzeCandidateService(
    candidateId: string,
    deps: AnalyzeDeps = {},
): AsyncAppResult<Analysis> {
    const analyze = deps.analyze ?? googleAnalyzeBenchmark;

    try {
        const found = await findCandidateWithVacancy(candidateId);
        if (!found) return err(AppErrors.notFound({ targets: ["id"] }));
        const { candidate, vacancy } = found;

        const benchmark = await buildBenchmark(vacancy, deps);
        if (!benchmark.ok) {
            await setCandidateStatus(candidate.id, "failed");
            return err(benchmark.error);
        }

        let output;
        try {
            output = await analyze({
                vacancyTitle: vacancy.title,
                benchmark: benchmark.data,
                profile: candidate.profile,
            });
        } catch (cause) {
            await setCandidateStatus(candidate.id, "failed");
            return err(AppErrors.unexpected(cause));
        }

        const row = await upsertAnalysis({
            candidateId: candidate.id,
            score: output.score,
            dimensions: output.dimensions,
            summary: output.summary,
            interviewQuestions: output.interviewQuestions,
        });
        await setCandidateStatus(candidate.id, "analyzed");
        return ok(toAnalysis(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

Create `src/core/recruitment/server/services/retry-analysis-service.ts`:

```ts
import "server-only";
import type { Analysis } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
} from "@/server/common/responses";
import { findCandidateWithVacancy } from "../repository/candidates";
import {
    analyzeCandidateService,
    type AnalyzeDeps,
} from "./analyze-candidate-service";

/** Admin re-run of a failed (or stale) analysis, org-scoped. */
export async function retryAnalysisService(
    userId: string,
    organizationId: string,
    candidateId: string,
    deps: AnalyzeDeps = {},
): AsyncAppResult<Analysis> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const found = await findCandidateWithVacancy(candidateId);
        if (!found || found.vacancy.organizationId !== organizationId) {
            return err(AppErrors.notFound({ targets: ["id"] }));
        }
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }

    return analyzeCandidateService(candidateId, deps);
}
```

Create `src/core/recruitment/server/services/delete-candidate-service.ts`:

```ts
import "server-only";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    deleteCandidate,
    findCandidateWithVacancy,
} from "../repository/candidates";

/** Hard delete for privacy requests — the analysis cascades. */
export async function deleteCandidateService(
    userId: string,
    organizationId: string,
    candidateId: string,
): AsyncAppResult<{ deleted: true }> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const found = await findCandidateWithVacancy(candidateId);
        if (!found || found.vacancy.organizationId !== organizationId) {
            return err(AppErrors.notFound({ targets: ["id"] }));
        }
        await deleteCandidate(candidateId);
        return ok({ deleted: true });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

Create `src/core/recruitment/server/services/list-candidates-service.ts`:

```ts
import "server-only";
import type { RankedCandidate } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { listCandidatesWithAnalysis } from "../repository/candidates";
import { toAnalysis, toCandidate } from "../repository/utils";
import { findVacancyById } from "../repository/vacancies";

export async function listCandidatesService(
    userId: string,
    organizationId: string,
    vacancyId: string,
): AsyncAppResult<RankedCandidate[]> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const vacancy = await findVacancyById(organizationId, vacancyId);
        if (!vacancy) return err(AppErrors.notFound({ targets: ["id"] }));

        const rows = await listCandidatesWithAnalysis(vacancyId);
        return ok(
            rows.map(({ candidate, analysis }) => ({
                candidate: toCandidate(candidate),
                analysis: analysis ? toAnalysis(analysis) : null,
            })),
        );
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
```

- [ ] **Step 6: Wire analysis into the apply flow**

Modify `src/core/recruitment/server/services/apply-to-vacancy-service.ts`:

1. Add to imports:

```ts
import {
    analyzeCandidateService,
    type AnalyzeDeps,
} from "./analyze-candidate-service";
```

2. Change the deps interface and signature:

```ts
export interface ApplyDeps extends AnalyzeDeps {
    parseCv?: ParseCvFn;
}
```

3. Replace the tail of the function (from `await insertCandidate(...)`) with:

```ts
        const inserted = await insertCandidate({
            vacancyId: vacancy.id,
            name: input.name,
            email: input.email,
            cvFilename: input.cv.filename,
            cvText: profile.plainText,
            profile,
            status: "pending",
        });

        // In-process analysis (no queue in this project). Failure leaves the
        // candidate `failed` — the application itself is already received.
        await analyzeCandidateService(inserted.id, deps);

        return ok({ received: true });
```

4. Update the apply test file: extend the `candidates` repository mock and add the analysis-flow cases:

```ts
vi.mock("../../repository/candidates", () => ({
    findCandidateByEmail: vi.fn(),
    insertCandidate: vi.fn(),
    findCandidateWithVacancy: vi.fn(),
    setCandidateStatus: vi.fn(),
}));
vi.mock("../../repository/analyses", () => ({ upsertAnalysis: vi.fn() }));
vi.mock(
    "@/core/knowledge/server/services/search-knowledge-service",
    () => ({ searchKnowledgeService: vi.fn() }),
);
```

and append inside the existing describe:

```ts
    it("runs analysis right after intake", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: {
                id: "c1",
                vacancyId: "v1",
                name: "Ana",
                email: "ana@x.com",
                cvFilename: "cv.pdf",
                cvText: profile.plainText,
                profile,
                status: "pending",
                createdAt: new Date(),
            },
            vacancy: vacancyRow(),
        });
        const analyze = vi.fn().mockResolvedValue({
            score: 50,
            dimensions: [
                { name: "a", score: 1, strengths: [], gaps: [] },
                { name: "b", score: 2, strengths: [], gaps: [] },
                { name: "c", score: 3, strengths: [], gaps: [] },
            ],
            summary: "s",
            interviewQuestions: ["q1", "q2", "q3"],
        });

        const result = await applyToVacancyService(input, {
            parseCv: fakeParse,
            analyze,
        });

        expect(result.ok).toBe(true);
        expect(analyze).toHaveBeenCalledOnce();
    });

    it("still returns received when analysis fails", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: {
                id: "c1",
                vacancyId: "v1",
                name: "Ana",
                email: "ana@x.com",
                cvFilename: "cv.pdf",
                cvText: profile.plainText,
                profile,
                status: "pending",
                createdAt: new Date(),
            },
            vacancy: vacancyRow(),
        });

        const result = await applyToVacancyService(input, {
            parseCv: fakeParse,
            analyze: async () => {
                throw new Error("model down");
            },
        });

        expect(result.ok).toBe(true);
        expect(setCandidateStatus).toHaveBeenCalledWith("c1", "failed");
    });
```

(Add `findCandidateWithVacancy`, `setCandidateStatus` and `upsertAnalysis` to the test's imports from the mocked modules.)

- [ ] **Step 7: Routes**

`list-candidates.route.ts`:

```ts
import { Elysia } from "elysia";
import { z } from "zod";
import { rankedCandidateSchema } from "@/core/recruitment/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listCandidatesService } from "../../services/list-candidates-service";

export const listCandidatesRoute = new Elysia().use(authed).get(
    "/vacancies/:id/candidates",
    async ({ user, session, params, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await listCandidatesService(
            user.id,
            org.data,
            params.id,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        params: z.object({ id: z.string() }),
        response: {
            200: successResponseSchema(
                z.array(rankedCandidateSchema),
                "RankedCandidates",
            ),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "Ranked candidates of a vacancy",
        },
    },
);
```

`retry-analysis.route.ts`:

```ts
import { Elysia } from "elysia";
import { z } from "zod";
import { analysisSchema } from "@/core/recruitment/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { retryAnalysisService } from "../../services/retry-analysis-service";

export const retryAnalysisRoute = new Elysia().use(authed).post(
    "/candidates/:id/retry-analysis",
    async ({ user, session, params, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await retryAnalysisService(
            user.id,
            org.data,
            params.id,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        params: z.object({ id: z.string() }),
        response: {
            200: successResponseSchema(analysisSchema, "Analysis"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: { tags: ["Recruitment"], summary: "Re-run a candidate analysis" },
    },
);
```

`delete-candidate.route.ts`:

```ts
import { Elysia } from "elysia";
import { z } from "zod";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { deleteCandidateService } from "../../services/delete-candidate-service";

const deleteResultSchema = z.object({ deleted: z.literal(true) });

export const deleteCandidateRoute = new Elysia().use(authed).delete(
    "/candidates/:id",
    async ({ user, session, params, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await deleteCandidateService(
            user.id,
            org.data,
            params.id,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        params: z.object({ id: z.string() }),
        response: {
            200: successResponseSchema(deleteResultSchema, "DeleteResult"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: { tags: ["Recruitment"], summary: "Delete a candidate (privacy)" },
    },
);
```

Update `src/core/recruitment/server/api/router.ts` — add the three routes:

```ts
import { applyRoute } from "./routes/apply.route";
import { deleteCandidateRoute } from "./routes/delete-candidate.route";
import { listCandidatesRoute } from "./routes/list-candidates.route";
import { retryAnalysisRoute } from "./routes/retry-analysis.route";
// ...inside the chain:
    .use(applyRoute)
    .use(listCandidatesRoute)
    .use(retryAnalysisRoute)
    .use(deleteCandidateRoute);
```

- [ ] **Step 8: Run tests + verify**

Run: `pnpm vitest run src/core/recruitment && pnpm typecheck && pnpm check`
Expected: all recruitment tests PASS; typecheck/check clean.

- [ ] **Step 9: Commit**

```bash
git add src/core/recruitment
git commit -m "feat(recruitment): CV analysis against the role benchmark"
```

---

### Task 12: Ranked candidates UI

**Files:**
- Modify: `src/core/recruitment/client/hooks.ts` (add `useRetryAnalysis`, `useDeleteCandidate`)
- Create: `src/core/recruitment/client/ui/candidate-list.tsx`
- Modify: `src/app/[slug]/app/hiring/[id]/page.tsx` (render the list)

**Interfaces:**
- Consumes: `RankedCandidate` type; Eden paths `client.candidates({ id })["retry-analysis"].post` and `client.candidates({ id }).delete`; `listCandidatesService` from Task 11.
- Produces: the vacancy-detail ranking surface (score badge, expandable analysis, retry, delete).

- [ ] **Step 1: Extend hooks (per-invocation ids — one hook instance drives any row)**

Append inside `useRecruitment` in `src/core/recruitment/client/hooks.ts`, and to its return object:

```ts
    const useRetryAnalysis = () =>
        useMutation({
            mutationFn: (id: string) =>
                client
                    .candidates({ id })
                    ["retry-analysis"].post.mutationOptions()
                    .mutationFn(undefined),
            onSuccess: () => router.refresh(),
        });

    const useDeleteCandidate = () =>
        useMutation({
            mutationFn: (id: string) =>
                client
                    .candidates({ id })
                    .delete.mutationOptions()
                    .mutationFn(undefined),
            onSuccess: () => router.refresh(),
        });
```

Return object becomes:

```ts
    return {
        useOffboard,
        useCreateVacancy,
        useRegenerateToken,
        useCloseVacancy,
        useRetryAnalysis,
        useDeleteCandidate,
    };
```

- [ ] **Step 2: Candidate list component**

Create `src/core/recruitment/client/ui/candidate-list.tsx`:

```tsx
"use client";

import { ChevronDown, ChevronUp, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import type { RankedCandidate } from "@/core/recruitment/domain/types";
import { useRecruitment } from "../hooks";

const STATUS_LABEL: Record<RankedCandidate["candidate"]["status"], string> = {
    pending: "Analizando…",
    analyzed: "Analizado",
    failed: "Análisis fallido",
};

function scoreVariant(score: number): "default" | "secondary" | "outline" {
    if (score >= 75) return "default";
    if (score >= 50) return "secondary";
    return "outline";
}

export function CandidateList({ items }: { items: RankedCandidate[] }) {
    const { useRetryAnalysis, useDeleteCandidate } = useRecruitment();
    const retry = useRetryAnalysis();
    const del = useDeleteCandidate();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (items.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                Aún no hay candidatos. Comparte el link público de la vacante.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {items.map(({ candidate, analysis }, index) => {
                const expanded = expandedId === candidate.id;
                return (
                    <div key={candidate.id} className="rounded-lg border">
                        <button
                            type="button"
                            className="flex w-full items-center gap-3 p-4 text-left"
                            onClick={() =>
                                setExpandedId(expanded ? null : candidate.id)
                            }
                        >
                            <span className="text-muted-foreground text-sm">
                                #{index + 1}
                            </span>
                            <div className="flex-1">
                                <div className="font-medium">
                                    {candidate.name}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    {candidate.email} · {candidate.cvFilename}
                                </div>
                            </div>
                            {analysis ? (
                                <Badge variant={scoreVariant(analysis.score)}>
                                    {Math.round(analysis.score)}/100
                                </Badge>
                            ) : (
                                <Badge variant="secondary">
                                    {STATUS_LABEL[candidate.status]}
                                </Badge>
                            )}
                            {expanded ? <ChevronUp /> : <ChevronDown />}
                        </button>

                        {expanded && (
                            <div className="space-y-4 border-t p-4">
                                {candidate.status === "failed" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={retry.isPending}
                                        onClick={() =>
                                            retry.mutate(candidate.id)
                                        }
                                    >
                                        <RefreshCw /> Reintentar análisis
                                    </Button>
                                )}
                                {analysis && (
                                    <>
                                        <p className="text-sm">
                                            {analysis.summary}
                                        </p>
                                        <div className="space-y-3">
                                            {analysis.dimensions.map((d) => (
                                                <div key={d.name}>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="font-medium">
                                                            {d.name}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {Math.round(
                                                                d.score,
                                                            )}
                                                            /100
                                                        </span>
                                                    </div>
                                                    {d.strengths.length > 0 && (
                                                        <ul className="list-inside list-disc text-sm">
                                                            {d.strengths.map(
                                                                (s) => (
                                                                    <li key={s}>
                                                                        {s}
                                                                    </li>
                                                                ),
                                                            )}
                                                        </ul>
                                                    )}
                                                    {d.gaps.length > 0 && (
                                                        <ul className="list-inside list-disc text-muted-foreground text-sm">
                                                            {d.gaps.map((g) => (
                                                                <li key={g}>
                                                                    {g}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <div className="mb-1 font-medium text-sm">
                                                Preguntas para la entrevista
                                            </div>
                                            <ol className="list-inside list-decimal text-sm">
                                                {analysis.interviewQuestions.map(
                                                    (q) => (
                                                        <li key={q}>{q}</li>
                                                    ),
                                                )}
                                            </ol>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={del.isPending}
                                        onClick={() => {
                                            if (
                                                window.confirm(
                                                    `¿Eliminar a ${candidate.name}? Se borra su CV y análisis.`,
                                                )
                                            ) {
                                                del.mutate(candidate.id);
                                            }
                                        }}
                                    >
                                        <Trash2 /> Eliminar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
```

- [ ] **Step 3: Render it in the vacancy detail page**

Modify `src/app/[slug]/app/hiring/[id]/page.tsx` — add imports and render below `VacancyAdminPanel`:

```tsx
import { CandidateList } from "@/core/recruitment/client/ui/candidate-list";
import { listCandidatesService } from "@/core/recruitment/server/services/list-candidates-service";
```

Inside the component, after fetching `vacancy`:

```tsx
    const candidates = await resolveResult(
        listCandidatesService(user.id, organization.id, id),
    );
```

And in the JSX, after `<VacancyAdminPanel vacancy={vacancy} />`:

```tsx
            <div className="space-y-3">
                <h2 className="font-medium">Candidatos</h2>
                <CandidateList items={candidates} />
            </div>
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm typecheck && pnpm check`
Expected: clean.

```bash
git add src/core/recruitment/client src/app/[slug]/app/hiring
git commit -m "feat(recruitment): ranked candidate list with analysis detail"
```

---

### Task 13: Full verification

**Files:** none new — verification only.

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: all existing 108 tests + new recruitment tests pass (≈130 total).

- [ ] **Step 2: Lint/format**

Run: `pnpm check`
Expected: clean. If biome reports import-order/format issues on touched files, run `pnpm check:fix` and re-check.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Note the runtime prerequisites in the final report**

- `pnpm db:migrate` needs a real `DATABASE_URL` (applies `0005`/`0006`) — not run in CI here.
- `pnpm build` needs real env secrets — note if skipped.
- Manual smoke (dev server): People → Marcar salida → copiar link → `/apply/[token]` subir PDF → ver candidato analizado en Contratación.

- [ ] **Step 5: Final commit (only if verification produced fixes)**

```bash
git add -A
git commit -m "chore(recruitment): verification fixes"
```

---

## Self-Review notes (plan author)

- **Spec coverage:** offboarding flip (T5), people sync (T4), manual vacancy (T8), public portal + honeypot/caps/dedupe (T10), automatic in-process analysis with person/manual benchmark (T11), ranking + gaps + interview questions (T11–T12), retry + delete (T11–T12), token regenerate + close (T8–T9), 404 leak-free public surface (T10). Out-of-scope items (rate limit, PDF retention, snapshots) deliberately absent.
- **Deviation from spec prose:** the ranked candidates list is a purpose-built component (score-sorted, expandable) instead of the generic data-table toolkit — the ranking is read-only, single-sort, and small (≤200 rows); adopting the toolkit would add pagination/sorting/filtering machinery with no user value at MVP. Flagged for follow-up if HR workflows grow.
- **Type consistency check:** `AnalyzeDeps` is defined in `analyze-candidate-service.ts` and imported by `apply-to-vacancy-service.ts` and `retry-analysis-service.ts` — single home. Repo fn names match across tasks (`findCandidateWithVacancy`, `setCandidateStatus`, `listCandidatesWithAnalysis`, `deleteCandidate`, `upsertAnalysis`, `insertVacancyNode`, `flipPersonNodeToVacancy`). Eden proxy paths match route definitions (`/vacancies/:id/close` → `client.vacancies({ id }).close.post`; `/candidates/:id/retry-analysis` → `client.candidates({ id })["retry-analysis"].post`).
- **Known soft spot:** `applyInputSchema.website` is `z.string().max(0).optional()` — the route maps `""` → `undefined` before calling the service, so a bot-filled honeypot fails validation as `invalidBody` (400) rather than a silent drop. That is acceptable (bots get a generic 400), but do not "fix" it to leak the honeypot's purpose in an error message.
