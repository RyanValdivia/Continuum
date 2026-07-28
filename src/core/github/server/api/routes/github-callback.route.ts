import { Elysia } from "elysia";
import { ServerConfig } from "@/config/server-config";
import { githubCallbackQuerySchema } from "@/core/github/domain/schemas";
import { handleGithubCallbackService } from "../../services/handle-github-callback-service";

/**
 * GitHub redirects the browser here after the user grants/denies access.
 * No `authed` guard — the signed `state` param is the authentication for this
 * leg, and it must match exactly what was registered as the OAuth App's
 * callback URL.
 */
export const githubCallbackRoute = new Elysia().get(
    "/callback",
    async ({ query, redirect }) => {
        const result = await handleGithubCallbackService({
            code: query.code,
            state: query.state,
            oauthError: query.error,
        });
        if (!result.ok) {
            return redirect(
                `${ServerConfig.baseUrl}/settings/organizations?github_error=1`,
            );
        }
        return redirect(
            `${ServerConfig.baseUrl}/${result.data.organizationSlug}/app/integrations`,
        );
    },
    {
        query: githubCallbackQuerySchema,
        detail: {
            tags: ["GitHub"],
            summary: "OAuth callback GitHub redirects to after consent",
        },
    },
);
