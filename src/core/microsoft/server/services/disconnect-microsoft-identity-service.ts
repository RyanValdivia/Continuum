import "server-only";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { deleteMicrosoftIdentity } from "../repository/delete-microsoft-identity";

/** Self-service — any member can unlink their own Microsoft account. */
export async function disconnectMicrosoftIdentityService(
    organizationId: string,
    userId: string,
): AsyncAppResult<{ id: string }> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await deleteMicrosoftIdentity(organizationId, userId);
        if (!row) return err(AppErrors.notFound({ targets: ["microsoft"] }));
        return ok(row);
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
