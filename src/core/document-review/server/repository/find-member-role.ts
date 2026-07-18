import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { member } from "@/server/drizzle/schemas/organization-schema";

/** Mirrors the join in `src/server/auth/require-organization.ts`. Backs the
 *  admin guard — `null` when the user isn't a member of the org at all. */
export async function findMemberRole(
    organizationId: string,
    userId: string,
): Promise<string | null> {
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
    return row?.role ?? null;
}
