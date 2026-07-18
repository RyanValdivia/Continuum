import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type PrincipalRow,
    principal,
} from "@/server/drizzle/schemas/authorization-schema";

/**
 * `person` principals for the graph's "person" node kind — cross-domain
 * table read (same pattern as `document-review` reading `knowledge`'s own
 * tables): this domain owns its own wire mapping instead of importing the
 * `authorization` domain's repository/service functions.
 *
 * `userIds` are `knowledgeNodes.personId` values (which store the Better
 * Auth `user.id`, not a principal id — see `ingest-slack-message.ts`'s
 * identical resolution) — this joins them back to their principal row.
 */
export async function findPersonPrincipalsByUserIds(params: {
    organizationId: string;
    userIds: string[];
}): Promise<PrincipalRow[]> {
    if (params.userIds.length === 0) return [];
    return db
        .select()
        .from(principal)
        .where(
            and(
                eq(principal.organizationId, params.organizationId),
                eq(principal.type, "person"),
                inArray(principal.userId, params.userIds),
            ),
        );
}
