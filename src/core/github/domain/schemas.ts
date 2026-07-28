import { z } from "zod";

/** Wire shape — never includes `accessToken`/`refreshToken`. */
export const githubConnectionSchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    githubLogin: z.string(),
    connectedByUserId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const githubStatusSchema = z.object({
    configured: z.boolean(),
    connected: z.boolean(),
    connection: githubConnectionSchema.nullable(),
});

export const githubRepoSchema = z.object({
    id: z.number(),
    fullName: z.string(),
    name: z.string(),
    owner: z.string(),
    private: z.boolean(),
    url: z.string(),
    description: z.string().nullable(),
});

export const githubReposSchema = z.object({
    items: z.array(githubRepoSchema),
});

export const githubCallbackQuerySchema = z.object({
    code: z.string().optional(),
    state: z.string(),
    error: z.string().optional(),
});

/** Request body: which repos to pull into the knowledge graph. Each repo
 *  contributes its README plus its open issues as separate documents. */
export const ingestGithubSchema = z.object({
    repos: z.array(z.string().min(1)).min(1).max(20),
});

export const githubIngestItemSchema = z.object({
    repo: z.string(),
    title: z.string(),
    ok: z.boolean(),
    chunksCreated: z.number().int().nonnegative(),
    nodesCreated: z.number().int().nonnegative(),
    error: z.string().nullable(),
});

export const githubIngestResultSchema = z.object({
    ingested: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    items: z.array(githubIngestItemSchema),
});
