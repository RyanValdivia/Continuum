import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { slackChannel } from "@/server/drizzle/schemas/slack-schema";

export async function deleteSlackChannelsByOrg(organizationId: string) {
    await db.delete(slackChannel).where(eq(slackChannel.organizationId, organizationId));
}
