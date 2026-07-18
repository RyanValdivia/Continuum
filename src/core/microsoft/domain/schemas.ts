import { z } from "zod";

/** Wire shape — never includes `accessToken`/`refreshToken`. */
export const microsoftConnectionSchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    tenantId: z.string(),
    connectedByUserId: z.string(),
    tokenExpiresAt: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const microsoftStatusSchema = z.object({
    configured: z.boolean(),
    connected: z.boolean(),
    connection: microsoftConnectionSchema.nullable(),
});

export const microsoftCallbackQuerySchema = z.object({
    code: z.string().optional(),
    state: z.string(),
    error: z.string().optional(),
});

/** A browsable drive root: a SharePoint site's default drive or the connecting user's OneDrive. */
export const microsoftSiteSchema = z.object({
    driveId: z.string(),
    displayName: z.string(),
    webUrl: z.string().nullable(),
    kind: z.enum(["site", "onedrive"]),
});

export const microsoftSitesSchema = z.object({
    items: z.array(microsoftSiteSchema),
});

export const microsoftDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    isFolder: z.boolean(),
    mimeType: z.string().nullable(),
    size: z.number().int().nonnegative().nullable(),
    webUrl: z.string().nullable(),
});

export const microsoftDriveItemsSchema = z.object({
    items: z.array(microsoftDriveItemSchema),
});

export const microsoftTeamSchema = z.object({
    id: z.string(),
    displayName: z.string(),
});

export const microsoftTeamsSchema = z.object({
    items: z.array(microsoftTeamSchema),
});

export const microsoftChannelSchema = z.object({
    id: z.string(),
    displayName: z.string(),
});

export const microsoftChannelsSchema = z.object({
    items: z.array(microsoftChannelSchema),
});

/** Request body: which drive files to pull into the knowledge graph. */
export const ingestMicrosoftFilesSchema = z.object({
    items: z
        .array(
            z.object({
                driveId: z.string().trim().min(1),
                itemId: z.string().trim().min(1),
            }),
        )
        .min(1)
        .max(50),
});

/** Ingestion window for Teams transcripts, in days; 0 = everything. */
export const teamsSinceDaysSchema = z.union([
    z.literal(0),
    z.literal(7),
    z.literal(30),
    z.literal(90),
]);

/** Request body: which Teams channels to pull into the knowledge graph. */
export const ingestMicrosoftTeamsSchema = z.object({
    channels: z
        .array(
            z.object({
                teamId: z.string().trim().min(1),
                channelId: z.string().trim().min(1),
            }),
        )
        .min(1)
        .max(20),
    sinceDays: teamsSinceDaysSchema,
});

export const microsoftIngestItemSchema = z.object({
    externalId: z.string(),
    title: z.string(),
    ok: z.boolean(),
    chunksCreated: z.number().int().nonnegative(),
    nodesCreated: z.number().int().nonnegative(),
    error: z.string().nullable(),
});

export const microsoftIngestResultSchema = z.object({
    ingested: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    items: z.array(microsoftIngestItemSchema),
});
