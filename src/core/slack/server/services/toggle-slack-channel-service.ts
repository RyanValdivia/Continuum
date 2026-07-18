import "server-only";
import type { SlackChannel } from "@/core/slack/domain/types";
import {
    getOrgMembership,
    ORG_ADMIN_ROLES,
} from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { decryptSecret } from "@/server/security/token-cipher";
import { joinSlackChannel } from "@/server/slack/slack-api";
import { findSlackConnectionByOrg } from "../repository/find-slack-connection";
import {
    markChannelJoined,
    setChannelMonitored,
} from "../repository/set-channel-monitored";
import { toSlackChannel } from "../repository/utils";

/**
 * Turning monitoring ON for a *public* channel the bot hasn't joined yet
 * auto-joins it (`conversations.join` — no human action needed). Private
 * channels can't be force-joined by the API; the caller still gets
 * `botIsMember: false` back and the UI tells the admin to `/invite` the bot.
 */
export async function toggleSlackChannelService(
    organizationId: string,
    userId: string,
    channelId: string,
    isMonitored: boolean,
): AsyncAppResult<SlackChannel> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const row = await setChannelMonitored(
            organizationId,
            channelId,
            isMonitored,
        );
        if (!row) return err(AppErrors.notFound({ targets: ["channelId"] }));

        if (isMonitored && !row.isPrivate && !row.botIsMember) {
            const connection = await findSlackConnectionByOrg(organizationId);
            if (connection) {
                await joinSlackChannel(
                    decryptSecret(connection.botToken),
                    row.slackChannelId,
                );
                await markChannelJoined(organizationId, row.id);
                row.botIsMember = true;
            }
        }

        return ok(toSlackChannel(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
