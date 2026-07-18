import "server-only";
import { db } from "@/server/drizzle/db";
import {
    type AccessControlEntryRow,
    accessControlEntry,
    type NewAccessControlEntryRow,
} from "@/server/drizzle/schemas/authorization-schema";

export async function insertAce(
    values: NewAccessControlEntryRow,
): Promise<AccessControlEntryRow> {
    const [row] = await db
        .insert(accessControlEntry)
        .values(values)
        .onConflictDoUpdate({
            target: [
                accessControlEntry.resourceType,
                accessControlEntry.resourceId,
                accessControlEntry.principalId,
                accessControlEntry.permission,
                accessControlEntry.effect,
            ],
            set: { inheritable: values.inheritable ?? true },
        })
        .returning();
    return row;
}
