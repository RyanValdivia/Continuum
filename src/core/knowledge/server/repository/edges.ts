import "server-only";
import type { EdgeType } from "@/core/knowledge/domain/types";
import { db } from "@/server/drizzle/db";
import {
    type KnowledgeEdgeRow,
    knowledgeEdges,
} from "@/server/drizzle/schemas/knowledge-schema";

export interface NewEdge {
    fromNodeId: string;
    toNodeId: string;
    type: EdgeType;
    weight?: number;
    sourceChunkId?: string | null;
}

/**
 * Insert edges, ignoring duplicates of the same (from, to, type) triple. Returns
 * only the rows actually created.
 */
export async function insertEdges(params: {
    organizationId: string;
    edges: NewEdge[];
}): Promise<KnowledgeEdgeRow[]> {
    if (params.edges.length === 0) return [];

    return db
        .insert(knowledgeEdges)
        .values(
            params.edges.map((e) => ({
                organizationId: params.organizationId,
                fromNodeId: e.fromNodeId,
                toNodeId: e.toNodeId,
                type: e.type,
                weight: e.weight ?? 1,
                sourceChunkId: e.sourceChunkId ?? null,
            })),
        )
        .onConflictDoNothing({
            target: [
                knowledgeEdges.fromNodeId,
                knowledgeEdges.toNodeId,
                knowledgeEdges.type,
            ],
        })
        .returning();
}
