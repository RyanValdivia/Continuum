import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { LinearStatus } from "@/core/linear/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findLinearConnectionByOrg } from "../repository/find-linear-connection";
import { toLinearConnection } from "../repository/utils";

export async function getLinearStatusService(
    organizationId: string,
    userId: string,
): AsyncAppResult<LinearStatus> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await findLinearConnectionByOrg(organizationId);
        return ok({
            configured: ServerConfig.linear.isConfigured,
            connected: row !== null,
            connection: row ? toLinearConnection(row) : null,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
