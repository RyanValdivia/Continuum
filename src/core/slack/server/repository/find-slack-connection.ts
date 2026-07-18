import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { slackConnection } from "@/server/drizzle/schemas/slack-schema";

export async function findSlackConnectionByOrg(organizationId: string) {
    const [row] = await db
        .select()
        .from(slackConnection)
        .where(eq(slackConnection.organizationId, organizationId))
        .limit(1);
    return row ?? null;
}
