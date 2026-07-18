import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { SlackWorkspaceStatus } from "@/core/slack/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findSlackConnectionByOrg } from "../repository/find-slack-connection";
import { toSlackConnection } from "../repository/utils";

export async function getSlackWorkspaceStatusService(
    organizationId: string,
    userId: string,
): AsyncAppResult<SlackWorkspaceStatus> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await findSlackConnectionByOrg(organizationId);
        return ok({
            configured: ServerConfig.slack.isWorkspaceConfigured,
            connected: row !== null,
            connection: row ? toSlackConnection(row) : null,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
