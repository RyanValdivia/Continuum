import "server-only";
import { getOrgMembership, ORG_ADMIN_ROLES } from "@/server/auth/get-org-membership";
import { AppErrors, type AsyncAppResult, err, ok } from "@/server/common/responses";
import { deleteNotionConnection } from "../repository/delete-notion-connection";

export async function disconnectNotionService(
    organizationId: string,
    userId: string,
): AsyncAppResult<{ id: string }> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const row = await deleteNotionConnection(organizationId);
        if (!row) return err(AppErrors.notFound({ targets: ["notion"] }));
        return ok(row);
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
