import "server-only";
import { db } from "@/server/drizzle/db";
import {
    type NewMicrosoftIdentityRow,
    microsoftIdentity,
} from "@/server/drizzle/schemas/microsoft-schema";

/**
 * Upserts on the `(organizationId, userId)` unique index — one Microsoft
 * link per person per org. If the Microsoft account is already claimed by a
 * *different* user in this org, the `(organizationId, microsoftUserId)`
 * unique index rejects the insert with a Postgres `23505`.
 */
export async function upsertMicrosoftIdentity(values: NewMicrosoftIdentityRow) {
    const [row] = await db
        .insert(microsoftIdentity)
        .values(values)
        .onConflictDoUpdate({
            target: [microsoftIdentity.organizationId, microsoftIdentity.userId],
            set: {
                microsoftUserId: values.microsoftUserId,
                email: values.email,
                displayName: values.displayName,
                avatarUrl: values.avatarUrl,
                updatedAt: new Date(),
            },
        })
        .returning();
    return row;
}
