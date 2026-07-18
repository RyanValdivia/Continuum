import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────
/** `read` = study a doc/concept · `talk` = ask a person's agent · `do` = act. */
export const taskTypeSchema = z.enum(["read", "talk", "do"]);

// ── Wire shapes ───────────────────────────────────────────────────────────────
export const onboardingTaskSchema = z.object({
    id: z.string(),
    type: taskTypeSchema,
    title: z.string(),
    detail: z.string(),
    /** What competency this task builds — mirrors the interview "what it measures". */
    competency: z.string(),
});

export const onboardingDaySchema = z.object({
    title: z.string(),
    tasks: z.array(onboardingTaskSchema),
});

export const onboardingPlanSchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    /** The member living this onboarding (the new hire). */
    newHireMemberId: z.string(),
    roleTitle: z.string(),
    /** Predecessor person node id — the agent every `talk` task opens. */
    benchmarkPersonId: z.string().nullable(),
    benchmarkPersonName: z.string().nullable(),
    vacancyId: z.string().nullable(),
    days: z.array(onboardingDaySchema),
    completedTaskIds: z.array(z.string()),
    createdAt: z.string(),
});

export const onboardingProgressSchema = z.object({
    done: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    isComplete: z.boolean(),
});

/** What the page renders: the plan plus its derived progress. */
export const onboardingPlanViewSchema = onboardingPlanSchema.extend({
    progress: onboardingProgressSchema,
});

/** Predecessor picker item — an org member the new hire steps into. */
export const onboardingTargetSchema = z.object({
    personId: z.string(),
    name: z.string(),
    role: z.string(),
});

// ── Admin / create inputs ─────────────────────────────────────────────────────
export const createOnboardingInputSchema = z.object({
    roleTitle: z.string().trim().min(1).max(200),
    benchmarkPersonId: z.string().trim().min(1).nullable().optional(),
    benchmarkPersonName: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .nullable()
        .optional(),
    vacancyId: z.string().trim().min(1).nullable().optional(),
});

// ── LLM output (structured generateText target; no ids yet) ────────────────────
export const onboardingTaskDraftSchema = z.object({
    type: taskTypeSchema,
    title: z.string().min(1).max(200),
    detail: z.string().min(1).max(1000),
    competency: z.string().min(1).max(300),
});

export const onboardingDayDraftSchema = z.object({
    title: z.string().min(1).max(200),
    tasks: z.array(onboardingTaskDraftSchema).min(1).max(5),
});

export const onboardingPlanOutputSchema = z.object({
    days: z.array(onboardingDayDraftSchema).min(2).max(7),
});
