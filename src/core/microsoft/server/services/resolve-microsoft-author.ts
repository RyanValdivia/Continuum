import "server-only";
import { findOrgMemberByEmail } from "@/server/auth/find-org-member-by-email";
import { findMicrosoftIdentityByMsUser } from "../repository/find-microsoft-identity-by-ms-user";
import { upsertMicrosoftIdentity } from "../repository/upsert-microsoft-identity";

/**
 * Resolves a Teams message author to a Continuum `userId`: first an explicit
 * personal link (`microsoft_identity`), then a one-time email match against
 * org members — using the email Graph already resolved for the transcript
 * (`resolveAuthorEmails`) — auto-saving the link so future syncs skip
 * straight to the fast path. Never throws: attribution failures must not
 * block ingestion.
 */
export async function resolveMicrosoftAuthor(
    organizationId: string,
    microsoftUserId: string | null,
    email: string | null,
    displayName: string,
): Promise<string | null> {
    if (!microsoftUserId) return null;

    const linked = await findMicrosoftIdentityByMsUser(
        organizationId,
        microsoftUserId,
    );
    if (linked) return linked;

    if (!email) return null;
    const userId = await findOrgMemberByEmail(organizationId, email);
    if (!userId) return null;

    try {
        await upsertMicrosoftIdentity({
            organizationId,
            userId,
            microsoftUserId,
            email,
            displayName,
            avatarUrl: null,
        });
    } catch {
        // Unique-violation race (concurrent syncs linking the same account) —
        // the resolved userId is still correct, ingestion continues.
    }
    return userId;
}
