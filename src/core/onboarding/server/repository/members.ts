import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { user } from "@/server/drizzle/schemas/auth-schema";
import { member } from "@/server/drizzle/schemas/organization-schema";

export interface OrgMemberRow {
    memberId: string;
    name: string;
    role: string;
}

/** Org members a new hire can step into. `memberId` is the personId scope used
 *  for the role digest and the person-agent chat. */
export async function listOrgMembers(
    organizationId: string,
): Promise<OrgMemberRow[]> {
    return db
        .select({
            memberId: member.id,
            name: user.name,
            role: member.role,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(eq(member.organizationId, organizationId))
        .orderBy(asc(user.name));
}
