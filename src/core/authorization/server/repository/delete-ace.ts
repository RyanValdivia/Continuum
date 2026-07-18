import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { accessControlEntry } from "@/server/drizzle/schemas/authorization-schema";

export async function deleteAce(
    organizationId: string,
    id: string,
): Promise<void> {
    await db
        .delete(accessControlEntry)
        .where(
            and(
                eq(accessControlEntry.id, id),
                eq(accessControlEntry.organizationId, organizationId),
            ),
        );
}
