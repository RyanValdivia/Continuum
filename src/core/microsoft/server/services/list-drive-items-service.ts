import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { MicrosoftDriveItems } from "@/core/microsoft/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    listDriveItems,
    MicrosoftUnauthorizedError,
} from "@/server/microsoft/graph-api";
import { resolveMicrosoftAccessToken } from "./resolve-microsoft-access-token";

export async function listMicrosoftDriveItemsService(
    organizationId: string,
    userId: string,
    driveId: string,
    folderId?: string,
): AsyncAppResult<MicrosoftDriveItems> {
    if (!ServerConfig.microsoft.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["microsoft"] }));
    }
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const token = await resolveMicrosoftAccessToken(organizationId);
        if (!token.ok) return err(token.error);
        const items = await listDriveItems(token.data, driveId, folderId);
        return ok({ items });
    } catch (cause) {
        if (cause instanceof MicrosoftUnauthorizedError) {
            return err(AppErrors.unauthorized(cause));
        }
        return err(AppErrors.unexpected(cause));
    }
}
