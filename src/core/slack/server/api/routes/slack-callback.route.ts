import { Elysia } from "elysia";
import { ServerConfig } from "@/config/server-config";
import { slackCallbackQuerySchema } from "@/core/slack/domain/schemas";
import { handleSlackCallbackService } from "../../services/handle-slack-callback-service";

/**
 * Slack redirects the browser here after the user grants/denies access.
 * No `authed` guard — the signed `state` param (see `oauth-state.ts`) is the
 * authentication for this leg, and it must match exactly what was registered
 * as the app's redirect URL in Slack's dashboard.
 */
export const slackCallbackRoute = new Elysia().get(
    "/callback",
    async ({ query, redirect }) => {
        const result = await handleSlackCallbackService({
            code: query.code,
            state: query.state,
            oauthError: query.error,
        });
        if (!result.ok) {
            const reason =
                result.error.code === "CONFLICT" ? "slack_conflict" : "slack_error";
            return redirect(
                `${ServerConfig.baseUrl}/settings/organizations?${reason}=1`,
            );
        }
        return redirect(
            `${ServerConfig.baseUrl}/${result.data.organizationSlug}/app/integrations`,
        );
    },
    {
        query: slackCallbackQuerySchema,
        detail: {
            tags: ["Slack"],
            summary: "OAuth callback Slack redirects to after consent",
        },
    },
);
