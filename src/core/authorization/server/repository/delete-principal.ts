import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { principal } from "@/server/drizzle/schemas/authorization-schema";

/** Cascades: deleting an `ou` deletes every principal parented under it
 *  (`principal.parentId` FK is `onDelete: "cascade"`), and every membership
 *  or ACE referencing any deleted principal. Mirrors deleting an AD OU. */
export async function deletePrincipal(
    organizationId: string,
    id: string,
): Promise<void> {
    await db
        .delete(principal)
        .where(and(eq(principal.id, id), eq(principal.organizationId, organizationId)));
}
