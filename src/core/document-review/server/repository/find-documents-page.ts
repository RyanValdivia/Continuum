import "server-only";
import { and, asc, count, desc, eq, ilike, inArray } from "drizzle-orm";
import type { DocumentReviewSearch } from "@/core/document-review/domain/types";
import { db } from "@/server/drizzle/db";
import {
    type SourceDocumentRow,
    sourceDocuments,
} from "@/server/drizzle/schemas/knowledge-schema";

const SORT_COLUMNS = {
    title: sourceDocuments.title,
    reviewStatus: sourceDocuments.reviewStatus,
    createdAt: sourceDocuments.createdAt,
    updatedAt: sourceDocuments.updatedAt,
} as const;

export async function findDocumentsPage(
    organizationId: string,
    params: DocumentReviewSearch,
): Promise<{ rows: SourceDocumentRow[]; total: number }> {
    const { page, perPage, sort, reviewStatus, connector, title } = params;

    const where = and(
        eq(sourceDocuments.organizationId, organizationId),
        reviewStatus.length > 0
            ? inArray(sourceDocuments.reviewStatus, reviewStatus)
            : undefined,
        connector.length > 0
            ? inArray(sourceDocuments.connector, connector)
            : undefined,
        title ? ilike(sourceDocuments.title, `%${title}%`) : undefined,
    );

    const orderBy = sort.length
        ? sort.map((item) => (item.desc ? desc : asc)(SORT_COLUMNS[item.id]))
        : [desc(sourceDocuments.createdAt)];

    const rows = await db
        .select()
        .from(sourceDocuments)
        .where(where)
        .orderBy(...orderBy)
        .limit(perPage)
        .offset((page - 1) * perPage);

    const [{ count: total }] = await db
        .select({ count: count() })
        .from(sourceDocuments)
        .where(where);

    return { rows, total: Number(total) };
}
