import "server-only";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { deleteSlackIdentity } from "../repository/delete-slack-identity";

/** Self-service — any member can unlink their own Slack account. */
export async function disconnectSlackService(
    organizationId: string,
    userId: string,
): AsyncAppResult<{ id: string }> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await deleteSlackIdentity(organizationId, userId);
        if (!row) return err(AppErrors.notFound({ targets: ["slack"] }));
        return ok(row);
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
