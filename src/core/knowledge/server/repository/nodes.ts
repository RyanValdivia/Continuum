import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { NodeOrigin, NodeType } from "@/core/knowledge/domain/types";
import { db } from "@/server/drizzle/db";
import {
    type KnowledgeNodeRow,
    knowledgeNodes,
} from "@/server/drizzle/schemas/knowledge-schema";
import { toVectorLiteral } from "./utils";

export interface NewNode {
    personId?: string | null;
    type: NodeType;
    label: string;
    summary?: string | null;
    embedding?: number[] | null;
    sourceChunkId?: string | null;
    origin: NodeOrigin;
    confidence?: number;
}

export async function insertNodes(params: {
    organizationId: string;
    nodes: NewNode[];
}): Promise<KnowledgeNodeRow[]> {
    if (params.nodes.length === 0) return [];

    return db
        .insert(knowledgeNodes)
        .values(
            params.nodes.map((n) => ({
                organizationId: params.organizationId,
                personId: n.personId ?? null,
                type: n.type,
                label: n.label,
                summary: n.summary ?? null,
                embedding: n.embedding ?? null,
                sourceChunkId: n.sourceChunkId ?? null,
                origin: n.origin,
                confidence: n.confidence ?? 1,
            })),
        )
        .returning();
}

export interface ScoredNodeRow {
    row: KnowledgeNodeRow;
    score: number;
}

/**
 * Cosine nearest-neighbour search over nodes that have an embedding, org-scoped
 * and optionally person-scoped. Nodes with a null embedding are excluded.
 */
export async function searchNodes(params: {
    organizationId: string;
    queryEmbedding: number[];
    personId?: string | null;
    limit: number;
}): Promise<ScoredNodeRow[]> {
    const literal = toVectorLiteral(params.queryEmbedding);
    const distance = sql<number>`(${knowledgeNodes.embedding} <=> ${literal}::vector)`;

    const where = and(
        eq(knowledgeNodes.organizationId, params.organizationId),
        isNotNull(knowledgeNodes.embedding),
        params.personId
            ? eq(knowledgeNodes.personId, params.personId)
            : undefined,
    );

    const rows = await db
        .select({
            id: knowledgeNodes.id,
            organizationId: knowledgeNodes.organizationId,
            personId: knowledgeNodes.personId,
            type: knowledgeNodes.type,
            label: knowledgeNodes.label,
            summary: knowledgeNodes.summary,
            embedding: knowledgeNodes.embedding,
            sourceChunkId: knowledgeNodes.sourceChunkId,
            origin: knowledgeNodes.origin,
            confidence: knowledgeNodes.confidence,
            createdAt: knowledgeNodes.createdAt,
            score: sql<number>`1 - ${distance}`,
        })
        .from(knowledgeNodes)
        .where(where)
        .orderBy(distance)
        .limit(params.limit);

    return rows.map(({ score, ...row }) => ({ row, score: Number(score) }));
}
