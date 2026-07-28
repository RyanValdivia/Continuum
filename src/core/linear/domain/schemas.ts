import { z } from "zod";

/** Wire shape — never includes `accessToken`/`refreshToken`. */
export const linearConnectionSchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    workspaceId: z.string(),
    workspaceName: z.string(),
    connectedByUserId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const linearStatusSchema = z.object({
    configured: z.boolean(),
    connected: z.boolean(),
    connection: linearConnectionSchema.nullable(),
});

export const linearIssueSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    url: z.string(),
    teamName: z.string().nullable(),
});

export const linearIssuesSchema = z.object({
    items: z.array(linearIssueSchema),
});

export const linearCallbackQuerySchema = z.object({
    code: z.string().optional(),
    state: z.string(),
    error: z.string().optional(),
});

/** Request body: which issues to pull into the knowledge graph. */
export const ingestLinearSchema = z.object({
    issueIds: z.array(z.string().min(1)).min(1).max(100),
});

export const linearIngestItemSchema = z.object({
    issueId: z.string(),
    title: z.string(),
    ok: z.boolean(),
    chunksCreated: z.number().int().nonnegative(),
    nodesCreated: z.number().int().nonnegative(),
    error: z.string().nullable(),
});

export const linearIngestResultSchema = z.object({
    ingested: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    items: z.array(linearIngestItemSchema),
});
