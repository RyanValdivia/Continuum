import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { member } from "@/server/drizzle/schemas/organization-schema";

export { ORG_ADMIN_ROLES } from "./org-admin-roles";

/** Elysia-side counterpart to `require-organization.ts` (which uses
 *  `next/navigation` and only works in RSCs). Returns `null` when the user
 *  isn't a member — callers decide how to fail (404 vs 403). */
export async function getOrgMembership(organizationId: string, userId: string) {
    const [row] = await db
        .select({ role: member.role })
        .from(member)
        .where(
            and(
                eq(member.organizationId, organizationId),
                eq(member.userId, userId),
            ),
        )
        .limit(1);
    return row ?? null;
}
