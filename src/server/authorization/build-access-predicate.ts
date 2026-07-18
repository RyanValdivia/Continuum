import "server-only";
import { and, eq, exists, inArray, not, or, type SQL, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "@/server/drizzle/db";
import { accessControlEntry } from "@/server/drizzle/schemas/authorization-schema";

/**
 * The DACL evaluation, as a composable Drizzle `SQL` fragment — drop it into
 * any `where(and(..., buildAccessPredicate(...)))`, list or single-row alike,
 * so every read path enforces the identical rule. Only ever checks the
 * `"read"` permission; write/admin grants exist for the management UI, not
 * for gating these read surfaces.
 *
 *   deny  = an ACE for this resource, this token, effect "deny"
 *   allow = an ACE for this resource, this token, effect "allow"
 *   open   policy: NOT deny AND (allow OR the resource has zero ACEs at all)
 *   closed policy: NOT deny AND allow
 *
 * Deny always wins, matching AD. `accessToken` must already be resolved
 * (`resolveTokenPrincipals`) — an empty token makes `allow` structurally
 * false, which is correct, but callers should still short-circuit an empty
 * token before reaching the DB (see each service's own guard) rather than
 * lean on this fragment alone.
 */
export function buildAccessPredicate(params: {
    accessToken: string[];
    defaultAccess: "open" | "closed";
    resourceType: "knowledge_node" | "source_document" | "ou";
    resourceIdColumn: PgColumn;
}): SQL {
    const { accessToken, defaultAccess, resourceType, resourceIdColumn } =
        params;

    const matches = (effect: "allow" | "deny") =>
        exists(
            db
                .select({ one: sql`1` })
                .from(accessControlEntry)
                .where(
                    and(
                        eq(accessControlEntry.resourceType, resourceType),
                        eq(accessControlEntry.resourceId, resourceIdColumn),
                        eq(accessControlEntry.permission, "read"),
                        eq(accessControlEntry.effect, effect),
                        accessToken.length > 0
                            ? inArray(accessControlEntry.principalId, accessToken)
                            : sql`false`,
                    ),
                ),
        );

    const deny = matches("deny");

    if (defaultAccess === "closed") {
        return and(not(deny), matches("allow")) as SQL;
    }

    const anyAce = exists(
        db
            .select({ one: sql`1` })
            .from(accessControlEntry)
            .where(
                and(
                    eq(accessControlEntry.resourceType, resourceType),
                    eq(accessControlEntry.resourceId, resourceIdColumn),
                    eq(accessControlEntry.permission, "read"),
                ),
            ),
    );

    return and(not(deny), or(matches("allow"), not(anyAce))) as SQL;
}
