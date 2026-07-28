import { Elysia } from "elysia";
import { ServerConfig } from "@/config/server-config";
import { linearCallbackQuerySchema } from "@/core/linear/domain/schemas";
import { handleLinearCallbackService } from "../../services/handle-linear-callback-service";

/**
 * Linear redirects the browser here after the user grants/denies access.
 * No `authed` guard — the signed `state` param is the authentication for this
 * leg, and it must match exactly what was registered as the app's redirect URI.
 */
export const linearCallbackRoute = new Elysia().get(
    "/callback",
    async ({ query, redirect }) => {
        const result = await handleLinearCallbackService({
            code: query.code,
            state: query.state,
            oauthError: query.error,
        });
        if (!result.ok) {
            return redirect(
                `${ServerConfig.baseUrl}/settings/organizations?linear_error=1`,
            );
        }
        return redirect(
            `${ServerConfig.baseUrl}/${result.data.organizationSlug}/app/integrations`,
        );
    },
    {
        query: linearCallbackQuerySchema,
        detail: {
            tags: ["Linear"],
            summary: "OAuth callback Linear redirects to after consent",
        },
    },
);
