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
import { deleteGithubConnection } from "../repository/delete-github-connection";

export async function disconnectGithubService(
    organizationId: string,
    userId: string,
): AsyncAppResult<{ id: string }> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const row = await deleteGithubConnection(organizationId);
        if (!row) return err(AppErrors.notFound({ targets: ["github"] }));
        return ok(row);
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
