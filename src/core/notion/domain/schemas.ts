import { z } from "zod";

/** Wire shape — never includes `accessToken`/`refreshToken`. */
export const notionConnectionSchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    workspaceId: z.string(),
    workspaceName: z.string(),
    workspaceIcon: z.string().nullable(),
    connectedByUserId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const notionStatusSchema = z.object({
    configured: z.boolean(),
    connected: z.boolean(),
    connection: notionConnectionSchema.nullable(),
});

export const notionPageSchema = z.object({
    id: z.string(),
    object: z.enum(["page", "database"]),
    url: z.string(),
    title: z.string(),
    parentId: z.string().nullable(),
    parentType: z.enum(["page", "database"]).nullable(),
    iconEmoji: z.string().nullable(),
    iconUrl: z.string().nullable(),
});

export const notionPagesSchema = z.object({
    items: z.array(notionPageSchema),
});

export const notionCallbackQuerySchema = z.object({
    code: z.string().optional(),
    state: z.string(),
    error: z.string().optional(),
});
