import "server-only";
import { getOrgMembership, ORG_ADMIN_ROLES } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";

/** Every write in this domain (OUs, groups, ACL grants, the org access
 *  policy) reshapes what other members can see — owner/admin only, same
 *  gate document-review uses. The service layer is the single authoritative
 *  check; routes only gate UI visibility. */
export async function assertOrgAdmin(
    userId: string,
    organizationId: string,
): AsyncAppResult<void> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }
    return ok(undefined);
}
