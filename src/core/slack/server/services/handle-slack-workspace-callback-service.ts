import "server-only";
import { eq } from "drizzle-orm";
import { ServerConfig } from "@/config/server-config";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { db } from "@/server/drizzle/db";
import { organization } from "@/server/drizzle/schemas/organization-schema";
import { encryptSecret } from "@/server/security/token-cipher";
import { verifySlackOAuthState } from "@/server/slack/oauth-state";
import { exchangeSlackBotCode } from "@/server/slack/slack-api";
import { upsertSlackConnection } from "../repository/upsert-slack-connection";

/** Resolves the org's slug so the route can redirect the browser back into
 *  `/{slug}/app/integrations` once the bot install is saved. */
export async function handleSlackWorkspaceCallbackService(params: {
    code?: string;
    state: string;
    oauthError?: string;
}): AsyncAppResult<{ organizationSlug: string }> {
    if (!ServerConfig.slack.isWorkspaceConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["slack"] }));
    }

    const decoded = verifySlackOAuthState(params.state);
    if (!decoded) return err(AppErrors.forbidden());

    const [org] = await db
        .select({ slug: organization.slug })
        .from(organization)
        .where(eq(organization.id, decoded.organizationId))
        .limit(1);
    if (!org) return err(AppErrors.notFound({ targets: ["organization"] }));

    if (params.oauthError || !params.code) {
        // Admin cancelled the Slack consent screen — not a server error.
        return ok({ organizationSlug: org.slug });
    }

    try {
        const token = await exchangeSlackBotCode({
            code: params.code,
            redirectUri: `${ServerConfig.baseUrl}/api/v1/slack/workspace/callback`,
            clientId: ServerConfig.slack.clientId as string,
            clientSecret: ServerConfig.slack.clientSecret as string,
        });

        await upsertSlackConnection({
            organizationId: decoded.organizationId,
            connectedByUserId: decoded.userId,
            teamId: token.team.id,
            teamName: token.team.name,
            botUserId: token.bot_user_id,
            botToken: encryptSecret(token.access_token),
        });

        return ok({ organizationSlug: org.slug });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
