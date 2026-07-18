import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { MicrosoftSites } from "@/core/microsoft/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    listSitesWithDrives,
    MicrosoftUnauthorizedError,
} from "@/server/microsoft/graph-api";
import { resolveMicrosoftAccessToken } from "./resolve-microsoft-access-token";

export async function listMicrosoftSitesService(
    organizationId: string,
    userId: string,
): AsyncAppResult<MicrosoftSites> {
    if (!ServerConfig.microsoft.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["microsoft"] }));
    }
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const token = await resolveMicrosoftAccessToken(organizationId);
        if (!token.ok) return err(token.error);
        const items = await listSitesWithDrives(token.data);
        return ok({ items });
    } catch (cause) {
        if (cause instanceof MicrosoftUnauthorizedError) {
            return err(AppErrors.unauthorized(cause));
        }
        return err(AppErrors.unexpected(cause));
    }
}
