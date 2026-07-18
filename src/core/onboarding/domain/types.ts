import type { z } from "zod";
import type {
    createOnboardingInputSchema,
    onboardingDayDraftSchema,
    onboardingDaySchema,
    onboardingPlanOutputSchema,
    onboardingPlanSchema,
    onboardingPlanViewSchema,
    onboardingProgressSchema,
    onboardingTargetSchema,
    onboardingTaskDraftSchema,
    onboardingTaskSchema,
    taskTypeSchema,
} from "./schemas";

export type TaskType = z.infer<typeof taskTypeSchema>;
export type OnboardingTask = z.infer<typeof onboardingTaskSchema>;
export type OnboardingDay = z.infer<typeof onboardingDaySchema>;
export type OnboardingPlan = z.infer<typeof onboardingPlanSchema>;
export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;
export type OnboardingPlanView = z.infer<typeof onboardingPlanViewSchema>;
export type OnboardingTarget = z.infer<typeof onboardingTargetSchema>;
export type CreateOnboardingInput = z.infer<typeof createOnboardingInputSchema>;
export type OnboardingTaskDraft = z.infer<typeof onboardingTaskDraftSchema>;
export type OnboardingDayDraft = z.infer<typeof onboardingDayDraftSchema>;
export type OnboardingPlanOutput = z.infer<typeof onboardingPlanOutputSchema>;
