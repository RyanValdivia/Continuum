import "server-only";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { getOrgMembership, ORG_ADMIN_ROLES } from "./get-org-membership";

/** DB-backed admin gate, so it lives at the service layer — routes and RSC
 *  pages only gate UI visibility. */
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
