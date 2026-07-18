import "server-only";
import type { Membership } from "@/core/authorization/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findMembershipsForGroup } from "../repository/find-memberships";
import { findPrincipalById } from "../repository/find-principal-by-id";
import { toMembership } from "../repository/utils";
import { assertOrgAdmin } from "./require-org-admin";

/** A group's roster — the members editor's data source. */
export async function listMembershipsService(
    userId: string,
    organizationId: string,
    groupId: string,
): AsyncAppResult<Membership[]> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const group = await findPrincipalById(organizationId, groupId);
        if (!group) return err(AppErrors.notFound({ targets: ["groupId"] }));

        const rows = await findMembershipsForGroup(groupId);
        return ok(rows.map(toMembership));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
