import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { NotionStatus } from "@/core/notion/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import { AppErrors, type AsyncAppResult, err, ok } from "@/server/common/responses";
import { findNotionConnectionByOrg } from "../repository/find-notion-connection";
import { toNotionConnection } from "../repository/utils";

export async function getNotionStatusService(
    organizationId: string,
    userId: string,
): AsyncAppResult<NotionStatus> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await findNotionConnectionByOrg(organizationId);
        return ok({
            configured: ServerConfig.notion.isConfigured,
            connected: row !== null,
            connection: row ? toNotionConnection(row) : null,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
