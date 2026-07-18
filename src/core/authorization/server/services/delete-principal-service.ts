import "server-only";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { deletePrincipal } from "../repository/delete-principal";
import { findPrincipalById } from "../repository/find-principal-by-id";
import { assertOrgAdmin } from "./require-org-admin";

/** `group`/`ou` only — a `person` principal is lifecycle-owned by the
 *  `member` row that provisioned it (see `provision-person-principal.ts`)
 *  and is never deleted through this admin surface directly. */
export async function deletePrincipalService(
    userId: string,
    organizationId: string,
    id: string,
): AsyncAppResult<void> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const existing = await findPrincipalById(organizationId, id);
        if (!existing) return err(AppErrors.notFound({ targets: ["id"] }));
        if (existing.type === "person") {
            return err(AppErrors.forbidden());
        }

        await deletePrincipal(organizationId, id);
        return ok(undefined);
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
