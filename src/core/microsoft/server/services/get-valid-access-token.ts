import "server-only";
import { ServerConfig } from "@/config/server-config";
import { decryptSecret, encryptSecret } from "@/server/security/token-cipher";
import type { MicrosoftConnectionRow } from "@/server/drizzle/schemas/microsoft-schema";
import { refreshMicrosoftToken } from "@/server/microsoft/graph-api";
import { upsertMicrosoftConnection } from "../repository/upsert-microsoft-connection";

/** Refresh a bit before the real deadline so a slow request never races expiry. */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Entra access tokens live ~1h, so unlike Notion we can't wait for a 401:
 * decrypt the stored token when it's still valid, otherwise run the
 * refresh_token grant and persist the rotated pair (encrypted) before use.
 * Throws when the grant fails — callers map that to a 401 "reconnect".
 */
export async function getValidAccessToken(
    connection: MicrosoftConnectionRow,
): Promise<string> {
    if (connection.tokenExpiresAt.getTime() - Date.now() > EXPIRY_BUFFER_MS) {
        return decryptSecret(connection.accessToken);
    }

    const refreshed = await refreshMicrosoftToken({
        refreshToken: decryptSecret(connection.refreshToken),
        clientId: ServerConfig.microsoft.clientId as string,
        clientSecret: ServerConfig.microsoft.clientSecret as string,
        tenantId: connection.tenantId,
    });

    await upsertMicrosoftConnection({
        organizationId: connection.organizationId,
        connectedByUserId: connection.connectedByUserId,
        tenantId: connection.tenantId,
        accessToken: encryptSecret(refreshed.accessToken),
        refreshToken: encryptSecret(refreshed.refreshToken),
        tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
    });

    return refreshed.accessToken;
}
