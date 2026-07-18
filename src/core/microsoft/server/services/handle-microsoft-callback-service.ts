import "server-only";
import { ServerConfig } from "@/config/server-config";
import { verifyOAuthState } from "@/server/security/oauth-state";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { encryptSecret } from "@/server/security/token-cipher";
import { exchangeMicrosoftCode } from "@/server/microsoft/graph-api";
import { findOrgSlug } from "../repository/find-org-slug";
import { upsertMicrosoftConnection } from "../repository/upsert-microsoft-connection";

/** Resolves the org's slug so the route can redirect the browser back into
 *  `/{slug}/app/...` once the connection is saved. */
export async function handleMicrosoftCallbackService(params: {
    code?: string;
    state: string;
    oauthError?: string;
}): AsyncAppResult<{ organizationSlug: string }> {
    if (!ServerConfig.microsoft.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["microsoft"] }));
    }

    const decoded = verifyOAuthState(params.state);
    if (!decoded) return err(AppErrors.forbidden());

    const slug = await findOrgSlug(decoded.organizationId);
    if (!slug) return err(AppErrors.notFound({ targets: ["organization"] }));

    if (params.oauthError || !params.code) {
        // User declined the consent screen — not a server error.
        return ok({ organizationSlug: slug });
    }

    try {
        const tenantId = ServerConfig.microsoft.tenantId as string;
        const tokens = await exchangeMicrosoftCode({
            code: params.code,
            redirectUri: `${ServerConfig.baseUrl}/api/v1/microsoft/callback`,
            clientId: ServerConfig.microsoft.clientId as string,
            clientSecret: ServerConfig.microsoft.clientSecret as string,
            tenantId,
        });
        await upsertMicrosoftConnection({
            organizationId: decoded.organizationId,
            connectedByUserId: decoded.userId,
            tenantId,
            accessToken: encryptSecret(tokens.accessToken),
            refreshToken: encryptSecret(tokens.refreshToken),
            tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        });
        return ok({ organizationSlug: slug });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
