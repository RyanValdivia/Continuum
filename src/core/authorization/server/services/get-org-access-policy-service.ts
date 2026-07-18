import "server-only";
import type { OrganizationAccessPolicy } from "@/core/authorization/domain/types";
import { getOrgAccessPolicy } from "@/server/authorization/get-org-access-policy";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { assertOrgAdmin } from "./require-org-admin";

export async function getOrgAccessPolicyService(
    userId: string,
    organizationId: string,
): AsyncAppResult<OrganizationAccessPolicy> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const defaultAccess = await getOrgAccessPolicy(organizationId);
        return ok({ organizationId, defaultAccess });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
