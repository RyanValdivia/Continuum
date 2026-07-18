import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { buildAccessPredicate } from "@/server/authorization/build-access-predicate";
import type { AccessScope } from "@/server/authorization/resolve-access-scope";
import { db } from "@/server/drizzle/db";
import {
    type ChunkRow,
    chunks,
} from "@/server/drizzle/schemas/knowledge-schema";
import { toVectorLiteral } from "./utils";

export interface NewChunk {
    content: string;
    ord: number;
    embedding: number[];
}

/**
 * Replace a document's chunks atomically: drop the old set, insert the new one.
 * Idempotent per re-sync — a document always reflects its latest content.
 */
export async function replaceDocumentChunks(params: {
    organizationId: string;
    documentId: string;
    personId?: string | null;
    chunks: NewChunk[];
}): Promise<ChunkRow[]> {
    return db.transaction(async (tx) => {
        await tx.delete(chunks).where(eq(chunks.documentId, params.documentId));

        if (params.chunks.length === 0) return [];

        return tx
            .insert(chunks)
            .values(
                params.chunks.map((c) => ({
                    organizationId: params.organizationId,
                    documentId: params.documentId,
                    personId: params.personId ?? null,
                    content: c.content,
                    ord: c.ord,
                    embedding: c.embedding,
                })),
            )
            .returning();
    });
}

export interface ScoredChunkRow {
    row: ChunkRow;
    score: number;
}

/**
 * Cosine nearest-neighbour search over chunks, org-scoped and optionally
 * person-scoped. `score` is `1 - cosineDistance` ∈ [0, 1]; higher is closer.
 */
export async function searchChunks(params: {
    organizationId: string;
    queryEmbedding: number[];
    personId?: string | null;
    limit: number;
    scope: AccessScope;
}): Promise<ScoredChunkRow[]> {
    const literal = toVectorLiteral(params.queryEmbedding);
    const distance = sql<number>`(${chunks.embedding} <=> ${literal}::vector)`;

    const where = and(
        eq(chunks.organizationId, params.organizationId),
        params.personId ? eq(chunks.personId, params.personId) : undefined,
        // A chunk is a fragment of a document — the ACL grants on the
        // document, not per-chunk, so this checks chunks.documentId.
        buildAccessPredicate({
            accessToken: params.scope.accessToken,
            defaultAccess: params.scope.defaultAccess,
            resourceType: "source_document",
            resourceIdColumn: chunks.documentId,
        }),
    );

    const rows = await db
        .select({
            id: chunks.id,
            organizationId: chunks.organizationId,
            documentId: chunks.documentId,
            personId: chunks.personId,
            content: chunks.content,
            ord: chunks.ord,
            embedding: chunks.embedding,
            createdAt: chunks.createdAt,
            score: sql<number>`1 - ${distance}`,
        })
        .from(chunks)
        .where(where)
        .orderBy(distance)
        .limit(params.limit);

    return rows.map(({ score, ...row }) => ({ row, score: Number(score) }));
}
