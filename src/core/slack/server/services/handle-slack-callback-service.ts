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
import { verifySlackOAuthState } from "@/server/slack/oauth-state";
import { exchangeSlackCode, fetchSlackUserInfo } from "@/server/slack/slack-api";
import { upsertSlackIdentity } from "../repository/upsert-slack-identity";

const SLACK_TEAM_ID_CLAIM = "https://slack.com/team_id";

/** Postgres SQLSTATE for unique_violation — the Slack account is already
 *  linked to a different user in this org (`slack_identity_org_slack_user_idx`). */
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
export async function handleSlackCallbackService(params: {
    code?: string;
    state: string;
    oauthError?: string;
}): AsyncAppResult<{ organizationSlug: string }> {
    if (!ServerConfig.slack.isIdentityConfigured) {
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
        // User cancelled the Slack consent screen — not a server error.
        return ok({ organizationSlug: org.slug });
    }

    try {
        const token = await exchangeSlackCode({
            code: params.code,
            redirectUri: `${ServerConfig.baseUrl}/api/v1/slack/callback`,
            clientId: ServerConfig.slack.clientId as string,
            clientSecret: ServerConfig.slack.clientSecret as string,
        });
        const identity = await fetchSlackUserInfo(token.access_token);

        await upsertSlackIdentity({
            organizationId: decoded.organizationId,
            userId: decoded.userId,
            slackUserId: identity.sub,
            slackTeamId: identity[SLACK_TEAM_ID_CLAIM],
            email: identity.email ?? null,
            displayName: identity.name ?? null,
            avatarUrl: identity.picture ?? null,
        });

        return ok({ organizationSlug: org.slug });
    } catch (cause) {
        if (isUniqueViolation(cause)) {
            return err(
                AppErrors.conflict({ targets: ["slackUserId"] }),
            );
        }
        return err(AppErrors.unexpected(cause));
    }
}
