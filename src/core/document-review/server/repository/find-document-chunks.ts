import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { chunks } from "@/server/drizzle/schemas/knowledge-schema";

/** Ordered ingested text for a document — the detail view's read-only content
 *  panel. Cross-domain table read (`chunks`), same pattern as reading
 *  `sourceDocuments` — no `knowledge` type imported. */
export async function findDocumentChunks(
    documentId: string,
    organizationId: string,
): Promise<{ content: string; ord: number }[]> {
    return db
        .select({ content: chunks.content, ord: chunks.ord })
        .from(chunks)
        .where(
            and(
                eq(chunks.documentId, documentId),
                eq(chunks.organizationId, organizationId),
            ),
        )
        .orderBy(asc(chunks.ord));
}
