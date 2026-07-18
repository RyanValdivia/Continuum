import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type AccessControlEntryRow,
    accessControlEntry,
} from "@/server/drizzle/schemas/authorization-schema";

/** Every ACE on one resource — the admin "who can see this document" panel. */
export async function findAcesForResource(params: {
    organizationId: string;
    resourceType: "knowledge_node" | "source_document" | "ou";
    resourceId: string;
}): Promise<AccessControlEntryRow[]> {
    return db
        .select()
        .from(accessControlEntry)
        .where(
            and(
                eq(accessControlEntry.organizationId, params.organizationId),
                eq(accessControlEntry.resourceType, params.resourceType),
                eq(accessControlEntry.resourceId, params.resourceId),
            ),
        );
}
