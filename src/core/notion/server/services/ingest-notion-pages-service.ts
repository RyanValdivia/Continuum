import "server-only";
import { ServerConfig } from "@/config/server-config";
import { ingestDocumentService } from "@/core/knowledge/server/services/ingest-document-service";
import type {
    IngestNotion,
    NotionIngestResult,
} from "@/core/notion/domain/types";
import {
    getOrgMembership,
    ORG_ADMIN_ROLES,
} from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { decryptSecret, encryptSecret } from "@/server/security/token-cipher";
import {
    blocksToPlainText,
    fetchNotionPageBlocks,
    type NotionSearchItem,
    NotionUnauthorizedError,
    refreshNotionToken,
    searchNotionAll,
} from "@/server/notion/notion-api";
import { findNotionConnectionByOrg } from "../repository/find-notion-connection";
import { upsertNotionConnection } from "../repository/upsert-notion-connection";

/**
 * Pull selected Notion pages into the knowledge graph. Admin-only (owner/admin).
 * For each page: fetch its blocks, flatten to text, and hand it to the
 * source-agnostic `ingestDocumentService` (chunk + embed + extract). One page's
 * failure never aborts the batch — it is reported per item.
 */
export async function ingestNotionPagesService(
    organizationId: string,
    userId: string,
    input: IngestNotion,
): AsyncAppResult<NotionIngestResult> {
    if (!ServerConfig.notion.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["notion"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const connection = await findNotionConnectionByOrg(organizationId);
        if (!connection)
            return err(AppErrors.notFound({ targets: ["notion"] }));

        // Resolve a working access token + the page catalog (title/url), refreshing
        // once if the stored token was revoked/rotated.
        let accessToken = decryptSecret(connection.accessToken);
        let pages: NotionSearchItem[];
        try {
            pages = await searchNotionAll(accessToken);
        } catch (cause) {
            if (!(cause instanceof NotionUnauthorizedError)) throw cause;
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
            accessToken = refreshed.access_token;
            pages = await searchNotionAll(accessToken);
        }

        const pageById = new Map(pages.map((p) => [p.id, p]));

        const items: NotionIngestResult["items"] = [];
        for (const pageId of input.pageIds) {
            const page = pageById.get(pageId);
            const title = page?.title ?? "Untitled";
            try {
                const blocks = await fetchNotionPageBlocks(accessToken, pageId);
                const content = blocksToPlainText(blocks);
                if (!content) {
                    items.push({
                        pageId,
                        title,
                        ok: false,
                        chunksCreated: 0,
                        nodesCreated: 0,
                        error: "Página sin texto para ingestar",
                    });
                    continue;
                }

                const result = await ingestDocumentService(organizationId, {
                    connector: "notion",
                    externalId: pageId,
                    title,
                    content,
                    url: page?.url,
                    extract: true,
                });

                if (!result.ok) {
                    items.push({
                        pageId,
                        title,
                        ok: false,
                        chunksCreated: 0,
                        nodesCreated: 0,
                        error: result.error.code,
                    });
                    continue;
                }

                items.push({
                    pageId,
                    title,
                    ok: true,
                    chunksCreated: result.data.chunksCreated,
                    nodesCreated: result.data.nodesCreated,
                    error: null,
                });
            } catch (cause) {
                items.push({
                    pageId,
                    title,
                    ok: false,
                    chunksCreated: 0,
                    nodesCreated: 0,
                    error: cause instanceof Error ? cause.message : "unknown",
                });
            }
        }

        const ingested = items.filter((i) => i.ok).length;
        return ok({ ingested, failed: items.length - ingested, items });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
