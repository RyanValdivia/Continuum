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
import { createSlackOAuthState } from "@/server/slack/oauth-state";

/** Bot scopes: read + join public channels, read private channels the bot
 *  is invited to, and resolve message authors for attribution matching. */
const BOT_SCOPES = [
    "channels:history",
    "channels:read",
    "channels:join",
    "groups:history",
    "groups:read",
    "users:read",
    "users:read.email",
    "team:read",
].join(",");

/** Installing the org-wide bot is admin-only — unlike personal identity linking. */
export async function getSlackWorkspaceConnectUrlService(
    organizationId: string,
    userId: string,
): AsyncAppResult<string> {
    if (!ServerConfig.slack.isWorkspaceConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["slack"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    const state = createSlackOAuthState(organizationId, userId);
    const redirectUri = `${ServerConfig.baseUrl}/api/v1/slack/workspace/callback`;
    const url = new URL("https://slack.com/oauth/v2/authorize");
    url.searchParams.set("client_id", ServerConfig.slack.clientId as string);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", BOT_SCOPES);
    url.searchParams.set("state", state);

    return ok(url.toString());
}
