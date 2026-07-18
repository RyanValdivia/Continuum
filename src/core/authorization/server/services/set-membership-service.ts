import "server-only";
import type {
    Membership,
    SetMembership,
} from "@/core/authorization/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findPrincipalById } from "../repository/find-principal-by-id";
import { insertMembership } from "../repository/insert-membership";
import { toMembership } from "../repository/utils";
import { assertOrgAdmin } from "./require-org-admin";

/** `groupId` must be a `group` (only groups have members); `memberId` must
 *  be a `person` or another `group` (nesting) — never an `ou`, which isn't
 *  a group-membership participant in this model, only a container. */
export async function setMembershipService(
    userId: string,
    organizationId: string,
    input: SetMembership,
): AsyncAppResult<Membership> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    if (input.memberId === input.groupId) {
        return err(AppErrors.invalidBody({ targets: ["memberId"] }));
    }

    try {
        const [member, group] = await Promise.all([
            findPrincipalById(organizationId, input.memberId),
            findPrincipalById(organizationId, input.groupId),
        ]);
        if (!member || !group) {
            return err(AppErrors.notFound({ targets: ["memberId", "groupId"] }));
        }
        if (group.type !== "group") {
            return err(AppErrors.invalidBody({ targets: ["groupId"] }));
        }
        if (member.type === "ou") {
            return err(AppErrors.invalidBody({ targets: ["memberId"] }));
        }

        const row = await insertMembership(input);
        return ok(toMembership(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
