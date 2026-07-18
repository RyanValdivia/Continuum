import { z } from "zod";

/** Wire shape — this domain never stores a token, so there's nothing to
 *  exclude the way Notion excludes `accessToken`/`refreshToken`. */
export const slackIdentitySchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    userId: z.string(),
    slackUserId: z.string(),
    slackTeamId: z.string(),
    email: z.string().nullable(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const slackStatusSchema = z.object({
    configured: z.boolean(),
    connected: z.boolean(),
    identity: slackIdentitySchema.nullable(),
});

export const slackCallbackQuerySchema = z.object({
    code: z.string().optional(),
    state: z.string(),
    error: z.string().optional(),
});

/** Wire shape for the org-wide bot install — never includes `botToken`. */
export const slackConnectionSchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    connectedByUserId: z.string(),
    teamId: z.string(),
    teamName: z.string(),
    botUserId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const slackWorkspaceStatusSchema = z.object({
    configured: z.boolean(),
    connected: z.boolean(),
    connection: slackConnectionSchema.nullable(),
});

export const slackChannelSchema = z.object({
    id: z.string(),
    slackChannelId: z.string(),
    name: z.string(),
    isPrivate: z.boolean(),
    isMonitored: z.boolean(),
    botIsMember: z.boolean(),
});

export const slackChannelsResponseSchema = z.object({
    channels: z.array(slackChannelSchema),
});

export const toggleSlackChannelSchema = z.object({
    isMonitored: z.boolean(),
});

export const syncSlackChannelResultSchema = z.object({
    channelId: z.string(),
    messagesFound: z.number().int().nonnegative(),
    ingested: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
});
