import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { organization } from "@/server/drizzle/schemas/organization-schema";

/** Slug lookup so the OAuth callback can redirect back into `/{slug}/app/...`. */
export async function findOrgSlug(organizationId: string) {
    const [row] = await db
        .select({ slug: organization.slug })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);
    return row?.slug ?? null;
}
