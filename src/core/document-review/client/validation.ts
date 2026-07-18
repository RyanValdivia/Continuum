import { z } from "zod";

import { reviewActionStatusSchema } from "@/core/document-review/domain/schemas";

export const reviewFormSchema = z.object({
    reviewStatus: reviewActionStatusSchema,
    note: z.string().max(2000, "Note must be 2000 characters or fewer."),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
