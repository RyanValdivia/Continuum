import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type PrincipalRow,
    principal,
} from "@/server/drizzle/schemas/authorization-schema";

/** The caller's own `person` principal — `null` if not yet provisioned. */
export async function findPrincipalByUser(
    organizationId: string,
    userId: string,
): Promise<PrincipalRow | null> {
    const [row] = await db
        .select()
        .from(principal)
        .where(
            and(
                eq(principal.organizationId, organizationId),
                eq(principal.userId, userId),
                eq(principal.type, "person"),
            ),
        )
        .limit(1);
    return row ?? null;
}
