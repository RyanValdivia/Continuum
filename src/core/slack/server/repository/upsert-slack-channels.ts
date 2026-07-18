import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type NewSlackChannelRow,
    slackChannel,
} from "@/server/drizzle/schemas/slack-schema";

/**
 * Syncs the channel catalog from Slack's `conversations.list` — upserts
 * name/isPrivate/botIsMember from the *new* row (`excluded`, Postgres's
 * upsert pseudo-table), but deliberately leaves `isMonitored` out of the
 * conflict `set` so a re-sync never clobbers the admin's opt-in choice.
 */
export async function upsertSlackChannels(rows: NewSlackChannelRow[]) {
    if (rows.length === 0) return [];

    return db
        .insert(slackChannel)
        .values(rows)
        .onConflictDoUpdate({
            target: [slackChannel.organizationId, slackChannel.slackChannelId],
            set: {
                name: sql`excluded.name`,
                isPrivate: sql`excluded.is_private`,
                botIsMember: sql`excluded.bot_is_member`,
                updatedAt: new Date(),
            },
        })
        .returning();
}
