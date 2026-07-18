import type { z } from "zod";
import {
    createManualVacancySchema,
    offboardInputSchema,
} from "@/core/recruitment/domain/schemas";

export const offboardFormSchema = offboardInputSchema;
export type OffboardFormValues = z.infer<typeof offboardFormSchema>;

export const createVacancyFormSchema = createManualVacancySchema;
export type CreateVacancyFormValues = z.infer<typeof createVacancyFormSchema>;
