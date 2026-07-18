import { Elysia } from "elysia";
import { ServerConfig } from "@/config/server-config";
import { microsoftCallbackQuerySchema } from "@/core/microsoft/domain/schemas";
import { handleMicrosoftIdentityCallbackService } from "../../services/handle-microsoft-identity-callback-service";

/**
 * Microsoft redirects the browser here after the user grants/denies access
 * to the personal identity link. No `authed` guard — the signed `state`
 * param is the authentication for this leg, distinct from the org-wide
 * `/microsoft/callback` tenant connection.
 */
export const microsoftIdentityCallbackRoute = new Elysia().get(
    "/identity/callback",
    async ({ query, redirect }) => {
        const result = await handleMicrosoftIdentityCallbackService({
            code: query.code,
            state: query.state,
            oauthError: query.error,
        });
        if (!result.ok) {
            const reason =
                result.error.code === "CONFLICT"
                    ? "microsoft_identity_conflict"
                    : "microsoft_identity_error";
            return redirect(
                `${ServerConfig.baseUrl}/settings/organizations?${reason}=1`,
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
            summary: "OAuth callback Microsoft redirects to after personal-link consent",
        },
    },
);
