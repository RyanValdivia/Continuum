import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { MicrosoftIdentityStatus } from "@/core/microsoft/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findMicrosoftIdentity } from "../repository/find-microsoft-identity";
import { toMicrosoftIdentity } from "../repository/utils";

export async function getMicrosoftIdentityStatusService(
    organizationId: string,
    userId: string,
): AsyncAppResult<MicrosoftIdentityStatus> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await findMicrosoftIdentity(organizationId, userId);
        return ok({
            configured: ServerConfig.microsoft.isIdentityConfigured,
            connected: row !== null,
            identity: row ? toMicrosoftIdentity(row) : null,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
