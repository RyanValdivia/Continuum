import "server-only";
import { ServerConfig } from "@/config/server-config";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    exchangeMicrosoftIdentityCode,
    fetchMicrosoftMe,
} from "@/server/microsoft/graph-api";
import { verifyOAuthState } from "@/server/security/oauth-state";
import { findOrgSlug } from "../repository/find-org-slug";
import { upsertMicrosoftIdentity } from "../repository/upsert-microsoft-identity";

/** Postgres SQLSTATE for unique_violation — the Microsoft account is already
 *  linked to a different user in this org (`microsoft_identity_org_ms_user_idx`). */
function isUniqueViolation(cause: unknown): boolean {
    return (
        typeof cause === "object" &&
        cause !== null &&
        "code" in cause &&
        (cause as { code?: unknown }).code === "23505"
    );
}

/** Resolves the org's slug so the route can redirect the browser back into
 *  `/{slug}/app/integrations` once the link is saved. */
export async function handleMicrosoftIdentityCallbackService(params: {
    code?: string;
    state: string;
    oauthError?: string;
}): AsyncAppResult<{ organizationSlug: string }> {
    if (!ServerConfig.microsoft.isIdentityConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["microsoft"] }));
    }

    const decoded = verifyOAuthState(params.state);
    if (!decoded) return err(AppErrors.forbidden());

    const slug = await findOrgSlug(decoded.organizationId);
    if (!slug) return err(AppErrors.notFound({ targets: ["organization"] }));

    if (params.oauthError || !params.code) {
        // User cancelled the Microsoft consent screen — not a server error.
        return ok({ organizationSlug: slug });
    }

    try {
        const accessToken = await exchangeMicrosoftIdentityCode({
            code: params.code,
            redirectUri: `${ServerConfig.baseUrl}/api/v1/microsoft/identity/callback`,
            clientId: ServerConfig.microsoft.clientId as string,
            clientSecret: ServerConfig.microsoft.clientSecret as string,
            tenantId: ServerConfig.microsoft.tenantId as string,
        });
        const profile = await fetchMicrosoftMe(accessToken);

        await upsertMicrosoftIdentity({
            organizationId: decoded.organizationId,
            userId: decoded.userId,
            microsoftUserId: profile.id,
            email: profile.email,
            displayName: profile.displayName,
            avatarUrl: null,
        });

        return ok({ organizationSlug: slug });
    } catch (cause) {
        if (isUniqueViolation(cause)) {
            return err(AppErrors.conflict({ targets: ["microsoftUserId"] }));
        }
        return err(AppErrors.unexpected(cause));
    }
}
