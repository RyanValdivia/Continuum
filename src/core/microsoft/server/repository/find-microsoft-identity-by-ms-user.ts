import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { microsoftIdentity } from "@/server/drizzle/schemas/microsoft-schema";

/** The ingestion-side lookup — resolve a Teams message author's Continuum
 *  `userId` from their Microsoft (AAD) user id, scoped to the org. `null`
 *  when that Microsoft account hasn't been linked yet. */
export async function findMicrosoftIdentityByMsUser(
    organizationId: string,
    microsoftUserId: string,
) {
    const [row] = await db
        .select({ userId: microsoftIdentity.userId })
        .from(microsoftIdentity)
        .where(
            and(
                eq(microsoftIdentity.organizationId, organizationId),
                eq(microsoftIdentity.microsoftUserId, microsoftUserId),
            ),
        )
        .limit(1);
    return row?.userId ?? null;
}
