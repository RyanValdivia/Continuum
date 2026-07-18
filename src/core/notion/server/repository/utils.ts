import type { NotionConnection } from "@/core/notion/domain/types";
import type { NotionConnectionRow } from "@/server/drizzle/schemas/notion-schema";

/** Convert a DB row into the wire shape — drops the encrypted tokens. */
export function toNotionConnection(
    row: NotionConnectionRow,
): NotionConnection {
    return {
        id: row.id,
        organizationId: row.organizationId,
        workspaceId: row.workspaceId,
        workspaceName: row.workspaceName,
        workspaceIcon: row.workspaceIcon,
        connectedByUserId: row.connectedByUserId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
