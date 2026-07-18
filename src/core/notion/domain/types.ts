import type { z } from "zod";
import type {
    notionConnectionSchema,
    notionPageSchema,
    notionPagesSchema,
    notionStatusSchema,
} from "./schemas";

export type NotionConnection = z.infer<typeof notionConnectionSchema>;
export type NotionStatus = z.infer<typeof notionStatusSchema>;
export type NotionPage = z.infer<typeof notionPageSchema>;
export type NotionPages = z.infer<typeof notionPagesSchema>;
