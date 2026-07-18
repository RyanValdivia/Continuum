import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type PrincipalRow,
    principal,
} from "@/server/drizzle/schemas/authorization-schema";

/**
 * Every principal in the org, flat. Small (people + groups + OUs, not a
 * bulk data table), so no pagination — the admin UI builds the OU tree and
 * group rosters client-side from `parentId`, same way any AD tree browser
 * renders a flat directory dump.
 */
export async function findPrincipalsByOrg(
    organizationId: string,
): Promise<PrincipalRow[]> {
    return db
        .select()
        .from(principal)
        .where(eq(principal.organizationId, organizationId))
        .orderBy(asc(principal.name));
}
