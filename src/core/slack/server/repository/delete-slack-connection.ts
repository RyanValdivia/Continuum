import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { slackConnection } from "@/server/drizzle/schemas/slack-schema";

export async function deleteSlackConnection(organizationId: string) {
    const [row] = await db
        .delete(slackConnection)
        .where(eq(slackConnection.organizationId, organizationId))
        .returning({ id: slackConnection.id });
    return row ?? null;
}
