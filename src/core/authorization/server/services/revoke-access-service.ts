import "server-only";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { deleteAce } from "../repository/delete-ace";
import { assertOrgAdmin } from "./require-org-admin";

export async function revokeAccessService(
    userId: string,
    organizationId: string,
    id: string,
): AsyncAppResult<void> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        await deleteAce(organizationId, id);
        return ok(undefined);
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
