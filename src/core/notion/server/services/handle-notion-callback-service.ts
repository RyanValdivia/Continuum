import "server-only";
import { eq } from "drizzle-orm";
import { ServerConfig } from "@/config/server-config";
import { verifyOAuthState } from "@/server/common/oauth-state";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { encryptSecret } from "@/server/common/token-cipher";
import { db } from "@/server/drizzle/db";
import { organization } from "@/server/drizzle/schemas/organization-schema";
import { exchangeNotionCode } from "@/server/notion/notion-api";
import { upsertNotionConnection } from "../repository/upsert-notion-connection";

/** Resolves the org's slug so the route can redirect the browser back into
 *  `/{slug}/app/...` once the connection is saved. */
export async function handleNotionCallbackService(params: {
    code?: string;
    state: string;
    oauthError?: string;
}): AsyncAppResult<{ organizationSlug: string }> {
    if (!ServerConfig.notion.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["notion"] }));
    }

    const decoded = verifyOAuthState(params.state);
    if (!decoded) return err(AppErrors.forbidden());

    const [org] = await db
        .select({ slug: organization.slug })
        .from(organization)
        .where(eq(organization.id, decoded.organizationId))
        .limit(1);
    if (!org) return err(AppErrors.notFound({ targets: ["organization"] }));

    if (params.oauthError || !params.code) {
        // User cancelled the Notion picker — not a server error.
        return ok({ organizationSlug: org.slug });
    }

    try {
        const token = await exchangeNotionCode({
            code: params.code,
            redirectUri: `${ServerConfig.baseUrl}/api/v1/notion/callback`,
            clientId: ServerConfig.notion.clientId as string,
            clientSecret: ServerConfig.notion.clientSecret as string,
        });

        await upsertNotionConnection({
            organizationId: decoded.organizationId,
            connectedByUserId: decoded.userId,
            workspaceId: token.workspace_id,
            workspaceName: token.workspace_name,
            workspaceIcon: token.workspace_icon,
            botId: token.bot_id,
            accessToken: encryptSecret(token.access_token),
            refreshToken: encryptSecret(token.refresh_token),
        });

        return ok({ organizationSlug: org.slug });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
