import { Elysia } from "elysia";
import { ServerConfig } from "@/config/server-config";
import { notionCallbackQuerySchema } from "@/core/notion/domain/schemas";
import { handleNotionCallbackService } from "../../services/handle-notion-callback-service";

/**
 * Notion redirects the browser here after the user grants/denies access.
 * No `authed` guard — the signed `state` param (see `server/common/oauth-state.ts`) is the
 * authentication for this leg, and it must match exactly what was registered
 * as the integration's redirect URI in Notion's dashboard.
 */
export const notionCallbackRoute = new Elysia().get(
    "/callback",
    async ({ query, redirect }) => {
        const result = await handleNotionCallbackService({
            code: query.code,
            state: query.state,
            oauthError: query.error,
        });
        if (!result.ok) {
            return redirect(
                `${ServerConfig.baseUrl}/settings/organizations?notion_error=1`,
            );
        }
        return redirect(
            `${ServerConfig.baseUrl}/${result.data.organizationSlug}/app/integrations`,
        );
    },
    {
        query: notionCallbackQuerySchema,
        detail: {
            tags: ["Notion"],
            summary: "OAuth callback Notion redirects to after consent",
        },
    },
);
