import "server-only";
import { findOrgMemberByEmail } from "@/server/auth/find-org-member-by-email";
import { decryptSecret } from "@/server/security/token-cipher";
import { fetchSlackUser } from "@/server/slack/slack-api";
import { findSlackConnectionByOrg } from "../repository/find-slack-connection";
import { findSlackIdentityBySlackUser } from "../repository/find-slack-identity-by-slack-user";
import { upsertSlackIdentity } from "../repository/upsert-slack-identity";

/**
 * Resolves a Slack message author to a Continuum `userId`: first an explicit
 * personal link (`slack_identity`), then — if the org's bot is installed —
 * a one-time email match against org members, auto-saving the link so
 * future messages skip straight to the fast path. Never throws: attribution
 * failures must not block ingestion (see `ingest-slack-message.ts`).
 */
export async function resolveSlackAuthor(
    organizationId: string,
    slackUserId: string,
): Promise<string | null> {
    const linked = await findSlackIdentityBySlackUser(
        organizationId,
        slackUserId,
    );
    if (linked) return linked;

    try {
        const connection = await findSlackConnectionByOrg(organizationId);
        if (!connection) return null;

        const botToken = decryptSecret(connection.botToken);
        const profile = await fetchSlackUser(botToken, slackUserId);
        if (!profile.email) return null;

        const userId = await findOrgMemberByEmail(
            organizationId,
            profile.email,
        );
        if (!userId) return null;

        await upsertSlackIdentity({
            organizationId,
            userId,
            slackUserId,
            slackTeamId: connection.teamId,
            email: profile.email,
            displayName: profile.displayName,
            avatarUrl: null,
        });
        return userId;
    } catch {
        // Slack API hiccup, or the Slack account is already claimed by a
        // different user in this org — fall back to unattributed.
        return null;
    }
}
