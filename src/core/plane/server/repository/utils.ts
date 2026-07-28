import type { PlaneConnection } from "@/core/plane/domain/types";
import type { PlaneConnectionRow } from "@/server/drizzle/schemas/plane-schema";

/** Convert a DB row into the wire shape — drops the encrypted API key. */
export function toPlaneConnection(row: PlaneConnectionRow): PlaneConnection {
    return {
        id: row.id,
        organizationId: row.organizationId,
        baseUrl: row.baseUrl,
        workspaceSlug: row.workspaceSlug,
        connectedByUserId: row.connectedByUserId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
