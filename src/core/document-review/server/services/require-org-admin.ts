import "server-only";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findMemberRole } from "../repository/find-member-role";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/** DB-backed, so it lives at the service layer, not the route. The service
 *  layer is the single authoritative gate for this domain — routes and RSC
 *  pages only gate UI visibility. */
export async function assertOrgAdmin(
    userId: string,
    organizationId: string,
): AsyncAppResult<void> {
    const role = await findMemberRole(organizationId, userId);
    if (!role || !ADMIN_ROLES.has(role)) {
        return err(AppErrors.forbidden());
    }
    return ok(undefined);
}
