import "server-only";
import { db } from "@/server/drizzle/db";
import {
    type PrincipalMembershipRow,
    principalMembership,
} from "@/server/drizzle/schemas/authorization-schema";

/** Idempotent: re-adding an existing membership is a no-op that still
 *  returns the row (the `set` is a self-assignment purely to make
 *  `ON CONFLICT` return something via `.returning()`). */
export async function insertMembership(params: {
    memberId: string;
    groupId: string;
}): Promise<PrincipalMembershipRow> {
    const [row] = await db
        .insert(principalMembership)
        .values(params)
        .onConflictDoUpdate({
            target: [principalMembership.memberId, principalMembership.groupId],
            set: { memberId: principalMembership.memberId },
        })
        .returning();
    return row;
}
