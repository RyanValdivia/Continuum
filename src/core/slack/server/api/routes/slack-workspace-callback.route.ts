import { Elysia } from "elysia";
import { ServerConfig } from "@/config/server-config";
import { slackCallbackQuerySchema } from "@/core/slack/domain/schemas";
import { handleSlackWorkspaceCallbackService } from "../../services/handle-slack-workspace-callback-service";

/**
 * Slack redirects the browser here after the admin grants/denies the bot
 * install. No `authed` guard — the signed `state` param is the
 * authentication for this leg, same scheme as the personal `/callback`.
 */
export const slackWorkspaceCallbackRoute = new Elysia().get(
    "/workspace/callback",
    async ({ query, redirect }) => {
        const result = await handleSlackWorkspaceCallbackService({
            code: query.code,
            state: query.state,
            oauthError: query.error,
        });
        if (!result.ok) {
            const reason =
                result.error.code === "CONFLICT"
                    ? "slack_conflict"
                    : "slack_error";
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
            summary: "OAuth callback Slack redirects to after bot install consent",
        },
    },
);
