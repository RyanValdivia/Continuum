import "server-only";
import { db } from "@/server/drizzle/db";
import {
    type NewSlackConnectionRow,
    slackConnection,
} from "@/server/drizzle/schemas/slack-schema";

export async function upsertSlackConnection(values: NewSlackConnectionRow) {
    const [row] = await db
        .insert(slackConnection)
        .values(values)
        .onConflictDoUpdate({
            target: slackConnection.organizationId,
            set: {
                connectedByUserId: values.connectedByUserId,
                teamId: values.teamId,
                teamName: values.teamName,
                botUserId: values.botUserId,
                botToken: values.botToken,
                updatedAt: new Date(),
            },
        })
        .returning();
    return row;
}
