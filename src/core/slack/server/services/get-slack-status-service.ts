import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { SlackStatus } from "@/core/slack/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findSlackIdentity } from "../repository/find-slack-identity";
import { toSlackIdentity } from "../repository/utils";

export async function getSlackStatusService(
    organizationId: string,
    userId: string,
): AsyncAppResult<SlackStatus> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await findSlackIdentity(organizationId, userId);
        return ok({
            configured: ServerConfig.slack.isIdentityConfigured,
            connected: row !== null,
            identity: row ? toSlackIdentity(row) : null,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
