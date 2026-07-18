import "server-only";
import type { SyncSlackChannelResult } from "@/core/slack/domain/types";
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
import { fetchSlackChannelHistory } from "@/server/slack/slack-api";
import { findSlackChannelById } from "../repository/find-slack-channels";
import { findSlackConnectionByOrg } from "../repository/find-slack-connection";
import { ingestSlackMessage } from "./ingest-slack-message";

/**
 * Manual "sync now" backfill for one channel — `conversations.history` is
 * rate-limited (as low as 1 req/min for non-Marketplace apps), so this is a
 * one-shot pull, not something to poll. Ongoing monitoring is the Events API
 * webhook once the channel is joined.
 */
export async function syncSlackChannelService(
    organizationId: string,
    userId: string,
    slackChannelId: string,
): AsyncAppResult<SyncSlackChannelResult> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const channel = await findSlackChannelById(
            organizationId,
            slackChannelId,
        );
        if (!channel) return err(AppErrors.notFound({ targets: ["channelId"] }));

        const connection = await findSlackConnectionByOrg(organizationId);
        if (!connection) return err(AppErrors.notFound({ targets: ["slack"] }));

        const botToken = decryptSecret(connection.botToken);
        const messages = await fetchSlackChannelHistory(
            botToken,
            slackChannelId,
        );

        let ingested = 0;
        let skipped = 0;
        for (const message of messages) {
            const result = await ingestSlackMessage({
                organizationId,
                message,
            });
            if (result.ingested) ingested++;
            else skipped++;
        }

        return ok({
            channelId: slackChannelId,
            messagesFound: messages.length,
            ingested,
            skipped,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
