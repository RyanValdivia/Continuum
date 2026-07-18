import "server-only";
import { ServerConfig } from "@/config/server-config";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { createSlackOAuthState } from "@/server/slack/oauth-state";

/** Any org member can link their own Slack account — no admin gate, unlike
 *  the org-wide Notion connection. */
export async function getSlackConnectUrlService(
    organizationId: string,
    userId: string,
): AsyncAppResult<string> {
    if (!ServerConfig.slack.isIdentityConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["slack"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    const state = createSlackOAuthState(organizationId, userId);
    const redirectUri = `${ServerConfig.baseUrl}/api/v1/slack/callback`;
    const url = new URL("https://slack.com/openid/connect/authorize");
    url.searchParams.set("client_id", ServerConfig.slack.clientId as string);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid profile email");
    url.searchParams.set("state", state);

    return ok(url.toString());
}
