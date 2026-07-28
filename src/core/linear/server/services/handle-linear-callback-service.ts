import "server-only";
import { eq } from "drizzle-orm";
import { ServerConfig } from "@/config/server-config";
import {
    exchangeLinearCode,
    fetchLinearOrganization,
} from "@/server/linear/linear-api";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { db } from "@/server/drizzle/db";
import { organization } from "@/server/drizzle/schemas/organization-schema";
import { encryptSecret } from "@/server/security/token-cipher";
import { verifyOAuthState } from "@/server/security/oauth-state";
import { upsertLinearConnection } from "../repository/upsert-linear-connection";

/** Resolves the org's slug so the route can redirect the browser back into
 *  `/{slug}/app/...` once the connection is saved. */
export async function handleLinearCallbackService(params: {
    code?: string;
    state: string;
    oauthError?: string;
}): AsyncAppResult<{ organizationSlug: string }> {
    if (!ServerConfig.linear.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["linear"] }));
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
        // User cancelled the Linear consent screen — not a server error.
        return ok({ organizationSlug: org.slug });
    }

    try {
        const token = await exchangeLinearCode({
            code: params.code,
            redirectUri: `${ServerConfig.baseUrl}/api/v1/linear/callback`,
            clientId: ServerConfig.linear.clientId as string,
            clientSecret: ServerConfig.linear.clientSecret as string,
        });
        const org2 = await fetchLinearOrganization(token.access_token);

        await upsertLinearConnection({
            organizationId: decoded.organizationId,
            connectedByUserId: decoded.userId,
            workspaceId: org2.id,
            workspaceName: org2.name,
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
