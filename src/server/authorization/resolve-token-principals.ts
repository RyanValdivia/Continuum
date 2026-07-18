import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/drizzle/db";

/**
 * The AD-style "access token": every principal id whose grants apply to
 * `userId` — the person principal itself, every ancestor OU (walking
 * `parentId` up), and every group transitively reached from the person or
 * any of its OU ancestors (nested groups included, since a group can itself
 * be a member of another group via `principal_membership`).
 *
 * Both recursive steps use `UNION` (not `UNION ALL`) deliberately: Postgres
 * stops a recursive CTE once an iteration adds no new distinct rows, which
 * is exactly the safe termination a membership or OU-parent cycle needs —
 * AD forbids cycles, this data doesn't enforce that at the DB level.
 *
 * Returns `[]` if `userId` has no person principal in this org (not yet
 * backfilled). Callers must treat an empty token as "no access", never
 * "skip the check".
 */
export async function resolveTokenPrincipals(params: {
    organizationId: string;
    userId: string;
}): Promise<string[]> {
    const result = await db.execute<{ id: string }>(sql`
        WITH RECURSIVE seed AS (
            SELECT id, parent_id
            FROM principal
            WHERE organization_id = ${params.organizationId}
              AND user_id = ${params.userId}
              AND type = 'person'
            LIMIT 1
        ),
        ou_ancestry AS (
            SELECT id, parent_id FROM seed
            UNION
            SELECT p.id, p.parent_id
            FROM principal p
            INNER JOIN ou_ancestry a ON p.id = a.parent_id
            WHERE p.organization_id = ${params.organizationId}
        ),
        group_closure AS (
            SELECT id FROM ou_ancestry
            UNION
            SELECT p.id
            FROM principal_membership pm
            INNER JOIN group_closure gc ON pm.member_id = gc.id
            INNER JOIN principal p ON p.id = pm.group_id
            WHERE p.organization_id = ${params.organizationId}
        )
        SELECT id FROM group_closure
    `);

    return result.rows.map((row) => row.id);
}
