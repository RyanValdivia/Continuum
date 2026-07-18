import "server-only";
import { ServerConfig } from "@/config/server-config";
import {
    getOrgMembership,
    ORG_ADMIN_ROLES,
} from "@/server/auth/get-org-membership";
import { createOAuthState } from "@/server/security/oauth-state";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { MICROSOFT_GRAPH_SCOPES } from "@/server/microsoft/graph-api";

export async function getMicrosoftConnectUrlService(
    organizationId: string,
    userId: string,
): AsyncAppResult<string> {
    if (!ServerConfig.microsoft.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["microsoft"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    const state = createOAuthState(organizationId, userId);
    const url = new URL(
        `https://login.microsoftonline.com/${ServerConfig.microsoft.tenantId}/oauth2/v2.0/authorize`,
    );
    url.searchParams.set(
        "client_id",
        ServerConfig.microsoft.clientId as string,
    );
    url.searchParams.set(
        "redirect_uri",
        `${ServerConfig.baseUrl}/api/v1/microsoft/callback`,
    );
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", MICROSOFT_GRAPH_SCOPES);
    url.searchParams.set("state", state);

    return ok(url.toString());
}
