import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { ConnectPlane, PlaneConnection } from "@/core/plane/domain/types";
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
import { fetchPlaneProjects, PlaneUnauthorizedError } from "@/server/plane/plane-api";
import { encryptSecret } from "@/server/security/token-cipher";
import { upsertPlaneConnection } from "../repository/upsert-plane-connection";
import { toPlaneConnection } from "../repository/utils";

/** No OAuth for Plane — validates the pasted API key against the workspace
 *  before storing it, so a typo surfaces immediately instead of on first sync. */
export async function connectPlaneService(
    organizationId: string,
    userId: string,
    input: ConnectPlane,
): AsyncAppResult<PlaneConnection> {
    if (!ServerConfig.plane.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["plane"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        await fetchPlaneProjects(
            input.baseUrl,
            input.workspaceSlug,
            input.apiKey,
        );
    } catch (cause) {
        if (cause instanceof PlaneUnauthorizedError) {
            return err(AppErrors.invalidBody({ targets: ["apiKey"] }));
        }
        return err(AppErrors.unexpected(cause));
    }

    try {
        const row = await upsertPlaneConnection({
            organizationId,
            connectedByUserId: userId,
            baseUrl: input.baseUrl,
            workspaceSlug: input.workspaceSlug,
            apiKey: encryptSecret(input.apiKey),
        });
        return ok(toPlaneConnection(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
