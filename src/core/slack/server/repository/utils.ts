import type { SlackChannel, SlackConnection, SlackIdentity } from "@/core/slack/domain/types";
import type {
    SlackChannelRow,
    SlackConnectionRow,
    SlackIdentityRow,
} from "@/server/drizzle/schemas/slack-schema";

/** Convert a DB row (Date timestamps) into the wire shape (ISO strings). */
export function toSlackIdentity(row: SlackIdentityRow): SlackIdentity {
    return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId,
        slackUserId: row.slackUserId,
        slackTeamId: row.slackTeamId,
        email: row.email,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

/** Never includes `botToken`. */
export function toSlackConnection(row: SlackConnectionRow): SlackConnection {
    return {
        id: row.id,
        organizationId: row.organizationId,
        connectedByUserId: row.connectedByUserId,
        teamId: row.teamId,
        teamName: row.teamName,
        botUserId: row.botUserId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function toSlackChannel(row: SlackChannelRow): SlackChannel {
    return {
        id: row.id,
        slackChannelId: row.slackChannelId,
        name: row.name,
        isPrivate: row.isPrivate,
        isMonitored: row.isMonitored,
        botIsMember: row.botIsMember,
    };
}
