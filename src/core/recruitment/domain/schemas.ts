import { z } from "zod";

// ── Enums (mirror the Drizzle pg enums) ───────────────────────────────────────
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
//    Elysia t.File — zod can't represent File under the OpenAPI mapping) ───────
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
