import "server-only";
import { and, count, eq, inArray, isNotNull } from "drizzle-orm";
import {
    aggregatePersonStats,
    type PersonKnowledgeStat,
} from "@/core/insights/domain/person-stats";
import { db } from "@/server/drizzle/db";
import { user } from "@/server/drizzle/schemas/auth-schema";
import {
    knowledgeEdges,
    knowledgeNodes,
    sourceDocuments,
} from "@/server/drizzle/schemas/knowledge-schema";
import { member } from "@/server/drizzle/schemas/organization-schema";

/** Node types that represent transferable know-how (excludes raw `document`). */
const CRITICAL_TYPES = ["decision", "process", "concept"] as const;

export interface GraphCounts {
    totalNodes: number;
    nodesWithEdge: number;
    totalEdges: number;
    totalDocuments: number;
}

export interface OrgMemberRecord {
    memberId: string;
    name: string;
    email: string;
}

export async function findOrgMembers(
    organizationId: string,
): Promise<OrgMemberRecord[]> {
    return db
        .select({
            memberId: member.id,
            name: user.name,
            email: user.email,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(eq(member.organizationId, organizationId))
        .orderBy(user.name);
}

export async function findGraphCounts(
    organizationId: string,
): Promise<GraphCounts> {
    const [[nodeRow], [docRow], edgeRows] = await Promise.all([
        db
            .select({ value: count() })
            .from(knowledgeNodes)
            .where(eq(knowledgeNodes.organizationId, organizationId)),
        db
            .select({ value: count() })
            .from(sourceDocuments)
            .where(eq(sourceDocuments.organizationId, organizationId)),
        db
            .select({
                from: knowledgeEdges.fromNodeId,
                to: knowledgeEdges.toNodeId,
            })
            .from(knowledgeEdges)
            .where(eq(knowledgeEdges.organizationId, organizationId)),
    ]);

    const connected = new Set<string>();
    for (const edge of edgeRows) {
        connected.add(edge.from);
        connected.add(edge.to);
    }

    return {
        totalNodes: nodeRow?.value ?? 0,
        totalDocuments: docRow?.value ?? 0,
        totalEdges: edgeRows.length,
        nodesWithEdge: connected.size,
    };
}

export async function findPersonKnowledgeStats(
    organizationId: string,
): Promise<PersonKnowledgeStat[]> {
    const rows = await db
        .select({
            personId: knowledgeNodes.personId,
            label: knowledgeNodes.label,
        })
        .from(knowledgeNodes)
        .where(
            and(
                eq(knowledgeNodes.organizationId, organizationId),
                isNotNull(knowledgeNodes.personId),
                inArray(knowledgeNodes.type, CRITICAL_TYPES),
            ),
        );

    return aggregatePersonStats(
        rows.map((r) => ({ personId: r.personId as string, label: r.label })),
    );
}
