import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { microsoftIdentity } from "@/server/drizzle/schemas/microsoft-schema";

/** Self-service only — a user can disconnect their own link, never someone
 *  else's, mirroring `deleteSlackIdentity`. */
export async function deleteMicrosoftIdentity(
    organizationId: string,
    userId: string,
) {
    const [row] = await db
        .delete(microsoftIdentity)
        .where(
            and(
                eq(microsoftIdentity.organizationId, organizationId),
                eq(microsoftIdentity.userId, userId),
            ),
        )
        .returning({ id: microsoftIdentity.id });
    return row ?? null;
}
