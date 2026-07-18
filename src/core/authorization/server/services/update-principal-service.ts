import "server-only";
import type {
    Principal,
    UpdatePrincipal,
} from "@/core/authorization/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findPrincipalById } from "../repository/find-principal-by-id";
import { updatePrincipal } from "../repository/update-principal";
import { toPrincipal } from "../repository/utils";
import { assertOrgAdmin } from "./require-org-admin";

/** Walks `candidateParentId`'s own ancestor chain looking for `id`. Bounded
 *  at 100 hops — real OU trees are a handful of levels deep; this only
 *  guards against reparenting a subtree into itself. */
async function wouldCreateCycle(
    organizationId: string,
    id: string,
    candidateParentId: string,
): Promise<boolean> {
    let current: string | null = candidateParentId;
    let hops = 0;
    while (current && hops < 100) {
        if (current === id) return true;
        const row = await findPrincipalById(organizationId, current);
        current = row?.parentId ?? null;
        hops++;
    }
    return false;
}

export async function updatePrincipalService(
    userId: string,
    organizationId: string,
    id: string,
    patch: UpdatePrincipal,
): AsyncAppResult<Principal> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const existing = await findPrincipalById(organizationId, id);
        if (!existing) return err(AppErrors.notFound({ targets: ["id"] }));

        if (patch.parentId) {
            const parent = await findPrincipalById(organizationId, patch.parentId);
            if (parent?.type !== "ou") {
                return err(AppErrors.invalidBody({ targets: ["parentId"] }));
            }
            if (await wouldCreateCycle(organizationId, id, patch.parentId)) {
                return err(AppErrors.conflict({ targets: ["parentId"] }));
            }
        }

        const row = await updatePrincipal(organizationId, id, patch);
        if (!row) return err(AppErrors.notFound({ targets: ["id"] }));
        return ok(toPrincipal(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
