import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type PrincipalMembershipRow,
    principalMembership,
} from "@/server/drizzle/schemas/authorization-schema";

/** Every group `memberId` directly belongs to (not transitive — that's
 *  `resolveTokenPrincipals`'s job). Powers "which groups is this person in". */
export async function findMembershipsForMember(
    memberId: string,
): Promise<PrincipalMembershipRow[]> {
    return db
        .select()
        .from(principalMembership)
        .where(eq(principalMembership.memberId, memberId));
}

/** Every direct member of `groupId`. Powers the group roster panel. */
export async function findMembershipsForGroup(
    groupId: string,
): Promise<PrincipalMembershipRow[]> {
    return db
        .select()
        .from(principalMembership)
        .where(eq(principalMembership.groupId, groupId));
}
