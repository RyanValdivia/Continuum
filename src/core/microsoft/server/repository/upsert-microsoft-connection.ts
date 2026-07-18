import "server-only";
import { db } from "@/server/drizzle/db";
import {
    microsoftConnection,
    type NewMicrosoftConnectionRow,
} from "@/server/drizzle/schemas/microsoft-schema";

export async function upsertMicrosoftConnection(
    values: NewMicrosoftConnectionRow,
) {
    const [row] = await db
        .insert(microsoftConnection)
        .values(values)
        .onConflictDoUpdate({
            target: microsoftConnection.organizationId,
            set: {
                connectedByUserId: values.connectedByUserId,
                tenantId: values.tenantId,
                accessToken: values.accessToken,
                refreshToken: values.refreshToken,
                tokenExpiresAt: values.tokenExpiresAt,
                updatedAt: new Date(),
            },
        })
        .returning();
    return row;
}
