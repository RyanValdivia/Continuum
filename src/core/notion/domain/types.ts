import type { z } from "zod";
import type {
    ingestNotionSchema,
    notionConnectionSchema,
    notionIngestResultSchema,
    notionPageSchema,
    notionPagesSchema,
    notionStatusSchema,
} from "./schemas";

export type NotionConnection = z.infer<typeof notionConnectionSchema>;
export type NotionStatus = z.infer<typeof notionStatusSchema>;
export type NotionPage = z.infer<typeof notionPageSchema>;
export type NotionPages = z.infer<typeof notionPagesSchema>;
export type IngestNotion = z.infer<typeof ingestNotionSchema>;
export type NotionIngestResult = z.infer<typeof notionIngestResultSchema>;
