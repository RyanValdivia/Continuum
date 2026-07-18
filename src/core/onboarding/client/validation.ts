import type { z } from "zod";
import { createOnboardingInputSchema } from "@/core/onboarding/domain/schemas";

export const generatePlanFormSchema = createOnboardingInputSchema;
export type GeneratePlanFormValues = z.infer<typeof generatePlanFormSchema>;
