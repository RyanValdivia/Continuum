import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { slackChannel } from "@/server/drizzle/schemas/slack-schema";

export async function setChannelMonitored(
    organizationId: string,
    id: string,
    isMonitored: boolean,
) {
    const [row] = await db
        .update(slackChannel)
        .set({ isMonitored, updatedAt: new Date() })
        .where(
            and(
                eq(slackChannel.id, id),
                eq(slackChannel.organizationId, organizationId),
            ),
        )
        .returning();
    return row ?? null;
}

export async function markChannelJoined(organizationId: string, id: string) {
    await db
        .update(slackChannel)
        .set({ botIsMember: true, updatedAt: new Date() })
        .where(
            and(
                eq(slackChannel.id, id),
                eq(slackChannel.organizationId, organizationId),
            ),
        );
}
