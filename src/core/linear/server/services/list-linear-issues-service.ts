import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { LinearIssues } from "@/core/linear/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    listLinearIssues,
    LinearUnauthorizedError,
    refreshLinearToken,
} from "@/server/linear/linear-api";
import { decryptSecret, encryptSecret } from "@/server/security/token-cipher";
import { findLinearConnectionByOrg } from "../repository/find-linear-connection";
import { upsertLinearConnection } from "../repository/upsert-linear-connection";

export async function listLinearIssuesService(
    organizationId: string,
    userId: string,
): AsyncAppResult<LinearIssues> {
    if (!ServerConfig.linear.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["linear"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const connection = await findLinearConnectionByOrg(organizationId);
        if (!connection)
            return err(AppErrors.notFound({ targets: ["linear"] }));

        const accessToken = decryptSecret(connection.accessToken);
        try {
            const items = await listLinearIssues(accessToken);
            return ok({ items });
        } catch (cause) {
            if (!(cause instanceof LinearUnauthorizedError)) throw cause;
            if (!connection.refreshToken) {
                return err(AppErrors.forbidden(cause));
            }

            const refreshed = await refreshLinearToken({
                refreshToken: decryptSecret(connection.refreshToken),
                clientId: ServerConfig.linear.clientId as string,
                clientSecret: ServerConfig.linear.clientSecret as string,
            });
            await upsertLinearConnection({
                organizationId,
                connectedByUserId: connection.connectedByUserId,
                workspaceId: connection.workspaceId,
                workspaceName: connection.workspaceName,
                accessToken: encryptSecret(refreshed.access_token),
                refreshToken: refreshed.refresh_token
                    ? encryptSecret(refreshed.refresh_token)
                    : null,
            });

            const items = await listLinearIssues(refreshed.access_token);
            return ok({ items });
        }
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
