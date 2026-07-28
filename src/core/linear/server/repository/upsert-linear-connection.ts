import "server-only";
import { db } from "@/server/drizzle/db";
import {
    linearConnection,
    type NewLinearConnectionRow,
} from "@/server/drizzle/schemas/linear-schema";

export async function upsertLinearConnection(values: NewLinearConnectionRow) {
    const [row] = await db
        .insert(linearConnection)
        .values(values)
        .onConflictDoUpdate({
            target: linearConnection.organizationId,
            set: {
                connectedByUserId: values.connectedByUserId,
                workspaceId: values.workspaceId,
                workspaceName: values.workspaceName,
                accessToken: values.accessToken,
                refreshToken: values.refreshToken,
                updatedAt: new Date(),
            },
        })
        .returning();
    return row;
}
