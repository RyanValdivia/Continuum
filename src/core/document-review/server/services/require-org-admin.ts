import "server-only";
import { ORG_ADMIN_ROLES } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findMemberRole } from "../repository/find-member-role";

/**
 * DB-backed, so it lives at the service layer, not the route. The service
 * layer is the single authoritative gate for this domain — routes and RSC
 * pages only gate UI visibility.
 *
 * This is deliberately the *only* access rule in this domain — document
 * review is an admin triage queue over every ingested document, so unlike
 * `knowledge`'s reads it does **not** compose `buildAccessPredicate`. An
 * admin who lacks an explicit ACL grant on a document must still be able to
 * see and act on it here; ACL grants only gate what non-admin members see
 * in search/chat/graph once a document is approved.
 */
export async function assertOrgAdmin(
    userId: string,
    organizationId: string,
): AsyncAppResult<void> {
    const role = await findMemberRole(organizationId, userId);
    if (!role || !ORG_ADMIN_ROLES.has(role)) {
        return err(AppErrors.forbidden());
    }
    return ok(undefined);
}
