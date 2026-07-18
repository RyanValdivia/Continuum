import "server-only";
import type {
    CreatePrincipal,
    Principal,
} from "@/core/authorization/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findPrincipalById } from "../repository/find-principal-by-id";
import { insertPrincipal } from "../repository/insert-principal";
import { toPrincipal } from "../repository/utils";
import { assertOrgAdmin } from "./require-org-admin";

/** Creates a `group` or `ou` — never a `person` (those are auto-provisioned;
 *  see `provision-person-principal.ts`). A `parentId`, if given, must be an
 *  existing `ou` in this org: only OUs contain things, mirroring AD. */
export async function createPrincipalService(
    userId: string,
    organizationId: string,
    input: CreatePrincipal,
): AsyncAppResult<Principal> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        if (input.parentId) {
            const parent = await findPrincipalById(organizationId, input.parentId);
            if (!parent) {
                return err(AppErrors.invalidBody({ targets: ["parentId"] }));
            }
            if (parent.type !== "ou") {
                return err(AppErrors.invalidBody({ targets: ["parentId"] }));
            }
        }

        const row = await insertPrincipal({
            organizationId,
            type: input.type,
            name: input.name,
            description: input.description ?? null,
            parentId: input.parentId,
        });
        return ok(toPrincipal(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
