import "server-only";
import type {
    AccessControlEntry,
    GrantAccess,
} from "@/core/authorization/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findPrincipalById } from "../repository/find-principal-by-id";
import { insertAce } from "../repository/insert-ace";
import { toAccessControlEntry } from "../repository/utils";
import { assertOrgAdmin } from "./require-org-admin";

/**
 * Writes one ACE. `resourceId` is intentionally **not** validated against
 * `knowledge_nodes`/`source_documents` here — this domain never imports
 * another domain's tables (see the repo-wide "no cross-domain type import"
 * rule); the admin UI only ever offers ids it already fetched from those
 * domains' own APIs, so a bad id here just grants access to nothing.
 */
export async function grantAccessService(
    userId: string,
    organizationId: string,
    input: GrantAccess,
): AsyncAppResult<AccessControlEntry> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const principal = await findPrincipalById(organizationId, input.principalId);
        if (!principal) {
            return err(AppErrors.invalidBody({ targets: ["principalId"] }));
        }

        const row = await insertAce({
            organizationId,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            principalId: input.principalId,
            permission: input.permission,
            effect: input.effect,
            inheritable: input.inheritable,
            createdBy: userId,
        });
        return ok(toAccessControlEntry(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
