import type {
    MicrosoftConnection,
    MicrosoftIdentity,
} from "@/core/microsoft/domain/types";
import type {
    MicrosoftConnectionRow,
    MicrosoftIdentityRow,
} from "@/server/drizzle/schemas/microsoft-schema";

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

/** Wire shape — this domain never stores a token, so there's nothing to exclude. */
export function toMicrosoftIdentity(
    row: MicrosoftIdentityRow,
): MicrosoftIdentity {
    return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId,
        microsoftUserId: row.microsoftUserId,
        email: row.email,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
