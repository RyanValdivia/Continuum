import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { slackIdentity } from "@/server/drizzle/schemas/slack-schema";

/** Self-service only — a user can disconnect their own link, never someone
 *  else's (there's no admin override here, unlike the org-wide Notion connection). */
export async function deleteSlackIdentity(
    organizationId: string,
    userId: string,
) {
    const [row] = await db
        .delete(slackIdentity)
        .where(
            and(
                eq(slackIdentity.organizationId, organizationId),
                eq(slackIdentity.userId, userId),
            ),
        )
        .returning({ id: slackIdentity.id });
    return row ?? null;
}
