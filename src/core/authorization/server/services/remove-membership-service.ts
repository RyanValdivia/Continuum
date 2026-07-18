import "server-only";
import type { SetMembership } from "@/core/authorization/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { deleteMembership } from "../repository/delete-membership";
import { findPrincipalById } from "../repository/find-principal-by-id";
import { assertOrgAdmin } from "./require-org-admin";

export async function removeMembershipService(
    userId: string,
    organizationId: string,
    input: SetMembership,
): AsyncAppResult<void> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        // `deleteMembership` filters only by memberId/groupId (no org column
        // on the join table) — confirm both belong to this org first, or an
        // admin of a foreign org could delete a membership row here.
        const [member, group] = await Promise.all([
            findPrincipalById(organizationId, input.memberId),
            findPrincipalById(organizationId, input.groupId),
        ]);
        if (!member || !group) {
            return err(AppErrors.notFound({ targets: ["memberId", "groupId"] }));
        }

        await deleteMembership(input);
        return ok(undefined);
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
