import { z } from "zod";

/** Wire shape — never includes `apiKey`. */
export const planeConnectionSchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    baseUrl: z.string(),
    workspaceSlug: z.string(),
    connectedByUserId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const planeStatusSchema = z.object({
    configured: z.boolean(),
    connected: z.boolean(),
    connection: planeConnectionSchema.nullable(),
});

/** No OAuth for Plane — the admin pastes a workspace API key generated in
 *  Plane's settings (Workspace Settings → API Tokens). */
export const connectPlaneSchema = z.object({
    baseUrl: z.url().max(500),
    workspaceSlug: z.string().trim().min(1).max(200),
    apiKey: z.string().trim().min(1).max(500),
});

export const planeProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    identifier: z.string(),
});

export const planeProjectsSchema = z.object({
    items: z.array(planeProjectSchema),
});

/** Request body: which projects' issues to pull into the knowledge graph. */
export const ingestPlaneSchema = z.object({
    projectIds: z.array(z.string().min(1)).min(1).max(20),
});

export const planeIngestItemSchema = z.object({
    issueId: z.string(),
    title: z.string(),
    ok: z.boolean(),
    chunksCreated: z.number().int().nonnegative(),
    nodesCreated: z.number().int().nonnegative(),
    error: z.string().nullable(),
});

export const planeIngestResultSchema = z.object({
    ingested: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    items: z.array(planeIngestItemSchema),
});
