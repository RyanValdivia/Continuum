import "server-only";
import type { SlackChannelsResponse } from "@/core/slack/domain/types";
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
import { listSlackChannels } from "@/server/slack/slack-api";
import { findSlackChannels } from "../repository/find-slack-channels";
import { findSlackConnectionByOrg } from "../repository/find-slack-connection";
import { upsertSlackChannels } from "../repository/upsert-slack-channels";
import { toSlackChannel } from "../repository/utils";

/**
 * Refreshes the org's channel catalog from Slack (`conversations.list`) and
 * returns it merged with the admin's stored `isMonitored` choices. Admin-only
 * — same org-wide-config gate as the rest of the bot install.
 */
export async function listSlackChannelsService(
    organizationId: string,
    userId: string,
): AsyncAppResult<SlackChannelsResponse> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const connection = await findSlackConnectionByOrg(organizationId);
        if (!connection) return err(AppErrors.notFound({ targets: ["slack"] }));

        const botToken = decryptSecret(connection.botToken);
        const remote = await listSlackChannels(botToken);

        await upsertSlackChannels(
            remote.map((c) => ({
                organizationId,
                slackChannelId: c.id,
                name: c.name,
                isPrivate: c.isPrivate,
                botIsMember: c.isMember,
            })),
        );

        const rows = await findSlackChannels(organizationId);
        return ok({ channels: rows.map(toSlackChannel) });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
