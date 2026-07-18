import type { DocumentReview } from "@/core/document-review/domain/types";
import type { SourceDocumentRow } from "@/server/drizzle/schemas/knowledge-schema";

/** Convert a `source_documents` row (Date timestamps) into the wire shape
 *  (ISO strings). Cross-domain table read, own wire schema — see domain notes. */
export function toDocumentReview(row: SourceDocumentRow): DocumentReview {
    return {
        id: row.id,
        organizationId: row.organizationId,
        personId: row.personId,
        connector: row.connector,
        title: row.title,
        url: row.url,
        reviewStatus: row.reviewStatus,
        reviewedBy: row.reviewedBy,
        reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
        reviewNote: row.reviewNote,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
