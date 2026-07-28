import type { LinearConnection } from "@/core/linear/domain/types";
import type { LinearConnectionRow } from "@/server/drizzle/schemas/linear-schema";

/** Convert a DB row into the wire shape — drops the encrypted tokens. */
export function toLinearConnection(row: LinearConnectionRow): LinearConnection {
    return {
        id: row.id,
        organizationId: row.organizationId,
        workspaceId: row.workspaceId,
        workspaceName: row.workspaceName,
        connectedByUserId: row.connectedByUserId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
