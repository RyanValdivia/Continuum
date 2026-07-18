import type { MicrosoftConnection } from "@/core/microsoft/domain/types";
import type { MicrosoftConnectionRow } from "@/server/drizzle/schemas/microsoft-schema";

/** Convert a DB row into the wire shape — drops the encrypted tokens. */
export function toMicrosoftConnection(
    row: MicrosoftConnectionRow,
): MicrosoftConnection {
    return {
        id: row.id,
        organizationId: row.organizationId,
        tenantId: row.tenantId,
        connectedByUserId: row.connectedByUserId,
        tokenExpiresAt: row.tokenExpiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
