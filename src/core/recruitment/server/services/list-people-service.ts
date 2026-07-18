import "server-only";
import type { PersonListItem } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    findOrgMembers,
    findPeopleNodes,
    upsertPersonNodes,
} from "../repository/people";

/**
 * The People surface: org members plus their graph state. Opening it syncs
 * member → `person` nodes (idempotent) so every member is visible in the
 * graph before any offboarding happens.
 */
export async function listPeopleService(
    userId: string,
    organizationId: string,
): AsyncAppResult<PersonListItem[]> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const members = await findOrgMembers(organizationId);
        await upsertPersonNodes(
            organizationId,
            members.map(({ memberId, name }) => ({ memberId, name })),
        );
        const nodes = await findPeopleNodes(organizationId);
        const nodeById = new Map(nodes.map((n) => [n.id, n]));

        return ok(
            members.map((m) => {
                const node = nodeById.get(m.memberId);
                const nodeType =
                    node?.type === "person" || node?.type === "vacancy"
                        ? node.type
                        : null;
                return {
                    memberId: m.memberId,
                    name: m.name,
                    email: m.email,
                    role: m.role,
                    nodeType,
                    vacancyId: nodeType === "vacancy" ? m.memberId : null,
                };
            }),
        );
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
