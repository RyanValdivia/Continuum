import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { PlaneProjects } from "@/core/plane/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    fetchPlaneProjects,
    PlaneUnauthorizedError,
} from "@/server/plane/plane-api";
import { decryptSecret } from "@/server/security/token-cipher";
import { findPlaneConnectionByOrg } from "../repository/find-plane-connection";

export async function listPlaneProjectsService(
    organizationId: string,
    userId: string,
): AsyncAppResult<PlaneProjects> {
    if (!ServerConfig.plane.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["plane"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const connection = await findPlaneConnectionByOrg(organizationId);
        if (!connection)
            return err(AppErrors.notFound({ targets: ["plane"] }));

        try {
            const apiKey = decryptSecret(connection.apiKey);
            const items = await fetchPlaneProjects(
                connection.baseUrl,
                connection.workspaceSlug,
                apiKey,
            );
            return ok({ items });
        } catch (cause) {
            if (cause instanceof PlaneUnauthorizedError) {
                return err(AppErrors.forbidden(cause));
            }
            throw cause;
        }
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
