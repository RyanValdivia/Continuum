import "server-only";
import { ServerConfig } from "@/config/server-config";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { MICROSOFT_IDENTITY_SCOPES } from "@/server/microsoft/graph-api";
import { createOAuthState } from "@/server/security/oauth-state";

/** Any org member can link their own Microsoft account — no admin gate,
 *  unlike the org-wide tenant connection. */
export async function getMicrosoftIdentityConnectUrlService(
    organizationId: string,
    userId: string,
): AsyncAppResult<string> {
    if (!ServerConfig.microsoft.isIdentityConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["microsoft"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

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
        `${ServerConfig.baseUrl}/api/v1/microsoft/identity/callback`,
    );
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", MICROSOFT_IDENTITY_SCOPES);
    url.searchParams.set("state", state);

    return ok(url.toString());
}
