import "server-only";
import { db } from "@/server/drizzle/db";
import {
    type NewSlackIdentityRow,
    slackIdentity,
} from "@/server/drizzle/schemas/slack-schema";

/**
 * Upserts on the `(organizationId, userId)` unique index — one Slack link per
 * person per org. If the Slack account is already claimed by a *different*
 * user in this org, the separate `(organizationId, slackUserId)` unique index
 * rejects the insert with a Postgres `23505` — the caller (service layer)
 * translates that into a friendly conflict error.
 */
export async function upsertSlackIdentity(values: NewSlackIdentityRow) {
    const [row] = await db
        .insert(slackIdentity)
        .values(values)
        .onConflictDoUpdate({
            target: [slackIdentity.organizationId, slackIdentity.userId],
            set: {
                slackUserId: values.slackUserId,
                slackTeamId: values.slackTeamId,
                email: values.email,
                displayName: values.displayName,
                avatarUrl: values.avatarUrl,
                updatedAt: new Date(),
            },
        })
        .returning();
    return row;
}
