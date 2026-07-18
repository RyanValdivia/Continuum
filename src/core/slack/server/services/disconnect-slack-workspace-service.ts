import "server-only";
import {
    getOrgMembership,
    ORG_ADMIN_ROLES,
} from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { deleteSlackChannelsByOrg } from "../repository/delete-slack-channels";
import { deleteSlackConnection } from "../repository/delete-slack-connection";

/** Removes the bot install and its whole channel catalog — a stale
 *  `isMonitored` list from a torn-down workspace would just confuse the next
 *  admin who reconnects. */
export async function disconnectSlackWorkspaceService(
    organizationId: string,
    userId: string,
): AsyncAppResult<{ id: string }> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const row = await deleteSlackConnection(organizationId);
        if (!row) return err(AppErrors.notFound({ targets: ["slack"] }));
        await deleteSlackChannelsByOrg(organizationId);
        return ok(row);
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
