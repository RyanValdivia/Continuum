import "server-only";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/server/drizzle/db";
import {
    member,
    organization,
} from "@/server/drizzle/schemas/organization-schema";

/** Route guard for `/[slug]/app/*`. 404s (not redirects) if the org doesn't
 *  exist or the user isn't a member — same response either way, so slugs
 *  can't be used to probe which organizations exist. */
export async function requireOrganization(slug: string, userId: string) {
    const [row] = await db
        .select({ organization, role: member.role })
        .from(organization)
        .innerJoin(member, eq(member.organizationId, organization.id))
        .where(and(eq(organization.slug, slug), eq(member.userId, userId)))
        .limit(1);

    if (!row) notFound();
    return row;
}

/** Picks a landing organization for a signed-in user with no slug in the URL yet. */
export async function findFirstOrganizationForUser(userId: string) {
    const [row] = await db
        .select({ organization })
        .from(organization)
        .innerJoin(member, eq(member.organizationId, organization.id))
        .where(eq(member.userId, userId))
        .orderBy(organization.createdAt)
        .limit(1);

    return row?.organization ?? null;
}
