import { Elysia } from "elysia";
import { ServerConfig } from "@/config/server-config";
import { microsoftCallbackQuerySchema } from "@/core/microsoft/domain/schemas";
import { handleMicrosoftCallbackService } from "../../services/handle-microsoft-callback-service";

/**
 * Microsoft redirects the browser here after the user grants/denies access.
 * No `authed` guard — the signed `state` param (see `server/common/oauth-state.ts`)
 * is the authentication for this leg, and it must match exactly what was
 * registered as the app's redirect URI in the Entra app registration.
 */
export const microsoftCallbackRoute = new Elysia().get(
    "/callback",
    async ({ query, redirect }) => {
        const result = await handleMicrosoftCallbackService({
            code: query.code,
            state: query.state,
            oauthError: query.error,
        });
        if (!result.ok) {
            return redirect(
                `${ServerConfig.baseUrl}/settings/organizations?microsoft_error=1`,
            );
        }
        return redirect(
            `${ServerConfig.baseUrl}/${result.data.organizationSlug}/app/integrations`,
        );
    },
    {
        query: microsoftCallbackQuerySchema,
        detail: {
            tags: ["Microsoft"],
            summary: "OAuth callback Microsoft redirects to after consent",
        },
    },
);
