import "server-only";
import { eq } from "drizzle-orm";
import { ServerConfig } from "@/config/server-config";
import { fetchGithubUser } from "@/server/github/github-api";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { db } from "@/server/drizzle/db";
import { organization } from "@/server/drizzle/schemas/organization-schema";
import { encryptSecret } from "@/server/security/token-cipher";
import { exchangeGithubCode } from "@/server/github/github-api";
import { verifyOAuthState } from "@/server/security/oauth-state";
import { upsertGithubConnection } from "../repository/upsert-github-connection";

/** Resolves the org's slug so the route can redirect the browser back into
 *  `/{slug}/app/...` once the connection is saved. */
export async function handleGithubCallbackService(params: {
    code?: string;
    state: string;
    oauthError?: string;
}): AsyncAppResult<{ organizationSlug: string }> {
    if (!ServerConfig.github.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["github"] }));
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
        // User cancelled the GitHub consent screen — not a server error.
        return ok({ organizationSlug: org.slug });
    }

    try {
        const token = await exchangeGithubCode({
            code: params.code,
            redirectUri: `${ServerConfig.baseUrl}/api/v1/github/callback`,
            clientId: ServerConfig.github.clientId as string,
            clientSecret: ServerConfig.github.clientSecret as string,
        });
        const ghUser = await fetchGithubUser(token.access_token);

        await upsertGithubConnection({
            organizationId: decoded.organizationId,
            connectedByUserId: decoded.userId,
            githubUserId: String(ghUser.id),
            githubLogin: ghUser.login,
            accessToken: encryptSecret(token.access_token),
            refreshToken: token.refresh_token
                ? encryptSecret(token.refresh_token)
                : null,
        });

        return ok({ organizationSlug: org.slug });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
