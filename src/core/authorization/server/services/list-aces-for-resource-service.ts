import "server-only";
import type { AccessControlEntry } from "@/core/authorization/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findAcesForResource } from "../repository/find-aces-for-resource";
import { toAccessControlEntry } from "../repository/utils";
import { assertOrgAdmin } from "./require-org-admin";

export async function listAcesForResourceService(
    userId: string,
    organizationId: string,
    params: {
        resourceType: "knowledge_node" | "source_document" | "ou";
        resourceId: string;
    },
): AsyncAppResult<AccessControlEntry[]> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const rows = await findAcesForResource({ organizationId, ...params });
        return ok(rows.map(toAccessControlEntry));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
