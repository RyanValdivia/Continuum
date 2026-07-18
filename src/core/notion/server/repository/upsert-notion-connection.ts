import "server-only";
import { db } from "@/server/drizzle/db";
import {
    type NewNotionConnectionRow,
    notionConnection,
} from "@/server/drizzle/schemas/notion-schema";

export async function upsertNotionConnection(values: NewNotionConnectionRow) {
    const [row] = await db
        .insert(notionConnection)
        .values(values)
        .onConflictDoUpdate({
            target: notionConnection.organizationId,
            set: {
                connectedByUserId: values.connectedByUserId,
                workspaceId: values.workspaceId,
                workspaceName: values.workspaceName,
                workspaceIcon: values.workspaceIcon,
                botId: values.botId,
                accessToken: values.accessToken,
                refreshToken: values.refreshToken,
                updatedAt: new Date(),
            },
        })
        .returning();
    return row;
}
