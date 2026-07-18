import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { NotionPages } from "@/core/notion/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { decryptSecret, encryptSecret } from "@/server/security/token-cipher";
import {
    NotionUnauthorizedError,
    refreshNotionToken,
    resolveMissingParents,
    searchNotionAll,
} from "@/server/notion/notion-api";
import { findNotionConnectionByOrg } from "../repository/find-notion-connection";
import { upsertNotionConnection } from "../repository/upsert-notion-connection";

export async function listNotionPagesService(
    organizationId: string,
    userId: string,
): AsyncAppResult<NotionPages> {
    if (!ServerConfig.notion.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["notion"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const connection = await findNotionConnectionByOrg(organizationId);
        if (!connection)
            return err(AppErrors.notFound({ targets: ["notion"] }));

        const accessToken = decryptSecret(connection.accessToken);
        try {
            const items = await searchNotionAll(accessToken);
            const resolved = await resolveMissingParents(accessToken, items);
            return ok({ items: resolved });
        } catch (cause) {
            if (!(cause instanceof NotionUnauthorizedError)) throw cause;

            // Notion access tokens can be revoked/rotated; refresh once and retry.
            const refreshed = await refreshNotionToken({
                refreshToken: decryptSecret(connection.refreshToken),
                clientId: ServerConfig.notion.clientId as string,
                clientSecret: ServerConfig.notion.clientSecret as string,
            });
            await upsertNotionConnection({
                organizationId,
                connectedByUserId: connection.connectedByUserId,
                workspaceId: refreshed.workspace_id,
                workspaceName: refreshed.workspace_name,
                workspaceIcon: refreshed.workspace_icon,
                botId: refreshed.bot_id,
                accessToken: encryptSecret(refreshed.access_token),
                refreshToken: encryptSecret(refreshed.refresh_token),
            });

            const items = await searchNotionAll(refreshed.access_token);
            const resolved = await resolveMissingParents(
                refreshed.access_token,
                items,
            );
            return ok({ items: resolved });
        }
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
