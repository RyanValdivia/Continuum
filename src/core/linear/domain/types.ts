import type { z } from "zod";
import type {
    ingestLinearSchema,
    linearConnectionSchema,
    linearIngestResultSchema,
    linearIssueSchema,
    linearIssuesSchema,
    linearStatusSchema,
} from "./schemas";

export type LinearConnection = z.infer<typeof linearConnectionSchema>;
export type LinearStatus = z.infer<typeof linearStatusSchema>;
export type LinearIssue = z.infer<typeof linearIssueSchema>;
export type LinearIssues = z.infer<typeof linearIssuesSchema>;
export type IngestLinear = z.infer<typeof ingestLinearSchema>;
export type LinearIngestResult = z.infer<typeof linearIngestResultSchema>;
