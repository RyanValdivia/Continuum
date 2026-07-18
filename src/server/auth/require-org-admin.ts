import "server-only";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { getOrgMembership, ORG_ADMIN_ROLES } from "./get-org-membership";

/**
 * Shared DB-backed admin gate. Lives at the service layer (not the route) so it
 * is the single authoritative check — routes and RSC pages only gate UI
 * visibility. Returns `forbidden` for non-members and non-admins alike.
 */
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
