import "server-only";
import {
    groupProfileNodes,
    type PersonProfile,
} from "@/core/insights/domain/person-profile";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    findOrgMemberById,
    findPersonDocuments,
    findPersonNodes,
} from "../repository/person-profile";

/**
 * A person's profile: who they are plus the know-how the graph has captured
 * from them. Member-visible (any org member can view a colleague and chat with
 * their agent) — so it gates on membership, not admin.
 */
export async function getPersonProfileService(
    userId: string,
    organizationId: string,
    memberId: string,
): AsyncAppResult<PersonProfile> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const person = await findOrgMemberById(organizationId, memberId);
        if (!person) return err(AppErrors.notFound({ targets: ["memberId"] }));

        const [nodes, documents] = await Promise.all([
            findPersonNodes(organizationId, memberId),
            findPersonDocuments(organizationId, memberId),
        ]);

        const groups = groupProfileNodes(nodes);

        return ok({
            person,
            counts: {
                decisions: groups.decisions.count,
                processes: groups.processes.count,
                concepts: groups.concepts.count,
                documents: documents.length,
            },
            decisions: groups.decisions.items,
            processes: groups.processes.items,
            concepts: groups.concepts.items,
            documents,
            hasKnowledge: nodes.length > 0 || documents.length > 0,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
