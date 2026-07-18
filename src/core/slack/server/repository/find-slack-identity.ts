import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { slackIdentity } from "@/server/drizzle/schemas/slack-schema";

export async function findSlackIdentity(organizationId: string, userId: string) {
    const [row] = await db
        .select()
        .from(slackIdentity)
        .where(
            and(
                eq(slackIdentity.organizationId, organizationId),
                eq(slackIdentity.userId, userId),
            ),
        )
        .limit(1);
    return row ?? null;
}
