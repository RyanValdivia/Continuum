import "server-only";
import { db } from "@/server/drizzle/db";
import {
    type NewPlaneConnectionRow,
    planeConnection,
} from "@/server/drizzle/schemas/plane-schema";

export async function upsertPlaneConnection(values: NewPlaneConnectionRow) {
    const [row] = await db
        .insert(planeConnection)
        .values(values)
        .onConflictDoUpdate({
            target: planeConnection.organizationId,
            set: {
                connectedByUserId: values.connectedByUserId,
                baseUrl: values.baseUrl,
                workspaceSlug: values.workspaceSlug,
                apiKey: values.apiKey,
                updatedAt: new Date(),
            },
        })
        .returning();
    return row;
}
