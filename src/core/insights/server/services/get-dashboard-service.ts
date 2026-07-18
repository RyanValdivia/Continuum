import "server-only";
import { computeScore } from "@/core/insights/domain/score";
import type {
    DashboardData,
    KeyPerson,
    PersonRisk,
} from "@/core/insights/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    findGraphCounts,
    findOrgMembers,
    findPersonKnowledgeStats,
} from "../repository/insights";

const TOP_RISKS_LIMIT = 5;

/**
 * The dashboard read model: the Knowledge Continuity Score plus the panels that
 * explain it (key people, top continuity risks, header totals). Admin-only —
 * it exposes org-wide risk. Pure scoring math lives in `domain/score.ts`; this
 * only shapes the aggregates and joins names.
 */
export async function getDashboardService(
    userId: string,
    organizationId: string,
): AsyncAppResult<DashboardData> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const [counts, stats, members] = await Promise.all([
            findGraphCounts(organizationId),
            findPersonKnowledgeStats(organizationId),
            findOrgMembers(organizationId),
        ]);

        const statByPerson = new Map(stats.map((s) => [s.personId, s]));
        const nameByPerson = new Map(members.map((m) => [m.memberId, m.name]));

        const attributedNodes = stats.reduce(
            (sum, s) => sum + s.attributedNodes,
            0,
        );
        const soleOwnedNodes = stats.reduce(
            (sum, s) => sum + s.soleOwnedNodes,
            0,
        );
        const membersWithKnowledge = members.filter(
            (m) => (statByPerson.get(m.memberId)?.attributedNodes ?? 0) > 0,
        ).length;

        const score = computeScore({
            totalMembers: members.length,
            membersWithKnowledge,
            totalNodes: counts.totalNodes,
            nodesWithEdge: counts.nodesWithEdge,
            attributedNodes,
            soleOwnedNodes,
            soleOwnedCounts: stats.map((s) => s.soleOwnedNodes),
        });

        const keyPeople: KeyPerson[] = members
            .map((m) => {
                const s = statByPerson.get(m.memberId);
                return {
                    memberId: m.memberId,
                    name: m.name,
                    email: m.email,
                    nodeCount: s?.attributedNodes ?? 0,
                    exclusiveCount: s?.soleOwnedNodes ?? 0,
                };
            })
            .sort((a, b) => b.nodeCount - a.nodeCount);

        const topRisks: PersonRisk[] = stats
            .filter((s) => s.soleOwnedNodes > 0)
            .sort((a, b) => b.soleOwnedNodes - a.soleOwnedNodes)
            .slice(0, TOP_RISKS_LIMIT)
            .map((s) => ({
                memberId: s.personId,
                name: nameByPerson.get(s.personId) ?? s.personId,
                exclusiveCount: s.soleOwnedNodes,
                areas: s.criticalAreas,
            }));

        return ok({
            score,
            keyPeople,
            topRisks,
            totals: {
                members: members.length,
                nodes: counts.totalNodes,
                edges: counts.totalEdges,
                documents: counts.totalDocuments,
            },
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
