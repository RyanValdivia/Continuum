import "server-only";
import type { Principal } from "@/core/authorization/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findPrincipalsByOrg } from "../repository/find-principals-by-org";
import { toPrincipal } from "../repository/utils";
import { assertOrgAdmin } from "./require-org-admin";

export async function listPrincipalsService(
    userId: string,
    organizationId: string,
): AsyncAppResult<Principal[]> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const rows = await findPrincipalsByOrg(organizationId);
        return ok(rows.map(toPrincipal));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
