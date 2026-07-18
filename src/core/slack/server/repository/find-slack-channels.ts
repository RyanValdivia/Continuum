import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { slackChannel } from "@/server/drizzle/schemas/slack-schema";

export async function findSlackChannels(organizationId: string) {
    return db
        .select()
        .from(slackChannel)
        .where(eq(slackChannel.organizationId, organizationId))
        .orderBy(slackChannel.name);
}

export async function findSlackChannelById(
    organizationId: string,
    slackChannelId: string,
) {
    const [row] = await db
        .select()
        .from(slackChannel)
        .where(
            and(
                eq(slackChannel.organizationId, organizationId),
                eq(slackChannel.slackChannelId, slackChannelId),
            ),
        )
        .limit(1);
    return row ?? null;
}

/** Backs the Events API webhook filter — is *any* org currently monitoring
 *  this Slack channel id? Channel ids are workspace-unique, so no org scope
 *  is needed on the lookup itself, only on what it returns. */
export async function findMonitoredChannelBySlackId(slackChannelId: string) {
    const [row] = await db
        .select()
        .from(slackChannel)
        .where(
            and(
                eq(slackChannel.slackChannelId, slackChannelId),
                eq(slackChannel.isMonitored, true),
            ),
        )
        .limit(1);
    return row ?? null;
}
