import "server-only";
import type {
    OrganizationAccessPolicy,
    SetOrgAccessPolicy,
} from "@/core/authorization/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { upsertOrgAccessPolicy } from "../repository/upsert-org-access-policy";
import { toOrgAccessPolicy } from "../repository/utils";
import { assertOrgAdmin } from "./require-org-admin";

export async function setOrgAccessPolicyService(
    userId: string,
    organizationId: string,
    input: SetOrgAccessPolicy,
): AsyncAppResult<OrganizationAccessPolicy> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const row = await upsertOrgAccessPolicy({
            organizationId,
            defaultAccess: input.defaultAccess,
        });
        return ok(toOrgAccessPolicy(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
