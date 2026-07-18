import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { microsoftIdentity } from "@/server/drizzle/schemas/microsoft-schema";

export async function findMicrosoftIdentity(
    organizationId: string,
    userId: string,
) {
    const [row] = await db
        .select()
        .from(microsoftIdentity)
        .where(
            and(
                eq(microsoftIdentity.organizationId, organizationId),
                eq(microsoftIdentity.userId, userId),
            ),
        )
        .limit(1);
    return row ?? null;
}
