import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { slackIdentity } from "@/server/drizzle/schemas/slack-schema";

/** The ingestion-side lookup — resolve a message author's Continuum
 *  `userId` from their Slack user id, scoped to the org that owns the
 *  connection. `null` when that Slack account hasn't been linked yet. */
export async function findSlackIdentityBySlackUser(
    organizationId: string,
    slackUserId: string,
) {
    const [row] = await db
        .select({ userId: slackIdentity.userId })
        .from(slackIdentity)
        .where(
            and(
                eq(slackIdentity.organizationId, organizationId),
                eq(slackIdentity.slackUserId, slackUserId),
            ),
        )
        .limit(1);
    return row?.userId ?? null;
}
