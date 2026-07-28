import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { GithubStatus } from "@/core/github/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findGithubConnectionByOrg } from "../repository/find-github-connection";
import { toGithubConnection } from "../repository/utils";

export async function getGithubStatusService(
    organizationId: string,
    userId: string,
): AsyncAppResult<GithubStatus> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await findGithubConnectionByOrg(organizationId);
        return ok({
            configured: ServerConfig.github.isConfigured,
            connected: row !== null,
            connection: row ? toGithubConnection(row) : null,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
