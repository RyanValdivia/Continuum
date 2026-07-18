import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { MicrosoftStatus } from "@/core/microsoft/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findMicrosoftConnectionByOrg } from "../repository/find-microsoft-connection";
import { toMicrosoftConnection } from "../repository/utils";

export async function getMicrosoftStatusService(
    organizationId: string,
    userId: string,
): AsyncAppResult<MicrosoftStatus> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await findMicrosoftConnectionByOrg(organizationId);
        return ok({
            configured: ServerConfig.microsoft.isConfigured,
            connected: row !== null,
            connection: row ? toMicrosoftConnection(row) : null,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
