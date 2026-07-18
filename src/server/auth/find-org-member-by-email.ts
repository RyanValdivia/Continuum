import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { user } from "@/server/drizzle/schemas/auth-schema";
import { member } from "@/server/drizzle/schemas/organization-schema";

/** Matches an external account's email to an org member, case-insensitive.
 *  The fallback identity link for connectors (Slack, Microsoft, …) when the
 *  employee hasn't explicitly connected their own account. */
export async function findOrgMemberByEmail(
    organizationId: string,
    email: string,
): Promise<string | null> {
    const [row] = await db
        .select({ userId: member.userId })
        .from(member)
        .innerJoin(user, eq(user.id, member.userId))
        .where(
            and(
                eq(member.organizationId, organizationId),
                sql`lower(${user.email}) = lower(${email})`,
            ),
        )
        .limit(1);
    return row?.userId ?? null;
}
