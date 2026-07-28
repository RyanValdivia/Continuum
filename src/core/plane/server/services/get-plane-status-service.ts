import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { PlaneStatus } from "@/core/plane/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findPlaneConnectionByOrg } from "../repository/find-plane-connection";
import { toPlaneConnection } from "../repository/utils";

export async function getPlaneStatusService(
    organizationId: string,
    userId: string,
): AsyncAppResult<PlaneStatus> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await findPlaneConnectionByOrg(organizationId);
        return ok({
            configured: ServerConfig.plane.isConfigured,
            connected: row !== null,
            connection: row ? toPlaneConnection(row) : null,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
