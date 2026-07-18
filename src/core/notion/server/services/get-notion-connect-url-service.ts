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

export async function getNotionConnectUrlService(
    organizationId: string,
    userId: string,
): AsyncAppResult<string> {
    if (!ServerConfig.notion.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["notion"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    const state = createOAuthState(organizationId, userId);
    const redirectUri = `${ServerConfig.baseUrl}/api/v1/notion/callback`;
    const url = new URL("https://api.notion.com/v1/oauth/authorize");
    url.searchParams.set("client_id", ServerConfig.notion.clientId as string);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("owner", "user");
    url.searchParams.set("state", state);

    return ok(url.toString());
}
