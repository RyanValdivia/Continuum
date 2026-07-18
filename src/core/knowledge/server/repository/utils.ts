import type {
    Chunk,
    KnowledgeEdge,
    KnowledgeNode,
    SourceDocument,
} from "@/core/knowledge/domain/types";
import type {
    ChunkRow,
    KnowledgeEdgeRow,
    KnowledgeNodeRow,
    SourceDocumentRow,
} from "@/server/drizzle/schemas/knowledge-schema";

/** pgvector text literal: `[0.1,0.2,...]`. Cast to `::vector` at the call site. */
export function toVectorLiteral(vector: number[]): string {
    return `[${vector.join(",")}]`;
}

export function toSourceDocument(row: SourceDocumentRow): SourceDocument {
    return {
        id: row.id,
        organizationId: row.organizationId,
        personId: row.personId,
        connector: row.connector,
        externalId: row.externalId,
        url: row.url,
        title: row.title,
        contentHash: row.contentHash,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

/** Wire chunk — the embedding never crosses the boundary. */
export function toChunk(row: ChunkRow): Chunk {
    return {
        id: row.id,
        documentId: row.documentId,
        personId: row.personId,
        content: row.content,
        ord: row.ord,
    };
}

export function toNode(row: KnowledgeNodeRow): KnowledgeNode {
    return {
        id: row.id,
        personId: row.personId,
        type: row.type,
        label: row.label,
        summary: row.summary,
        sourceChunkId: row.sourceChunkId,
        origin: row.origin,
        confidence: row.confidence,
        createdAt: row.createdAt.toISOString(),
    };
}

export function toEdge(row: KnowledgeEdgeRow): KnowledgeEdge {
    return {
        id: row.id,
        fromNodeId: row.fromNodeId,
        toNodeId: row.toNodeId,
        type: row.type,
        weight: row.weight,
    };
}
