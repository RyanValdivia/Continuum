import "server-only";
import { ServerConfig } from "@/config/server-config";
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
import { createOAuthState } from "@/server/security/oauth-state";

export async function getLinearConnectUrlService(
    organizationId: string,
    userId: string,
): AsyncAppResult<string> {
    if (!ServerConfig.linear.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["linear"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    const state = createOAuthState(organizationId, userId);
    const redirectUri = `${ServerConfig.baseUrl}/api/v1/linear/callback`;
    const url = new URL("https://linear.app/oauth/authorize");
    url.searchParams.set("client_id", ServerConfig.linear.clientId as string);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "read");
    url.searchParams.set("state", state);

    return ok(url.toString());
}
