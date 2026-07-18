import "server-only";
import { and, eq } from "drizzle-orm";
import type { ReviewActionStatus } from "@/core/document-review/domain/types";
import { db } from "@/server/drizzle/db";
import {
    type SourceDocumentRow,
    sourceDocuments,
} from "@/server/drizzle/schemas/knowledge-schema";

export async function setDocumentReview(
    id: string,
    organizationId: string,
    values: {
        reviewStatus: ReviewActionStatus;
        note?: string;
        reviewedBy: string;
    },
): Promise<SourceDocumentRow | null> {
    const [row] = await db
        .update(sourceDocuments)
        .set({
            reviewStatus: values.reviewStatus,
            reviewNote: values.note ?? null,
            reviewedBy: values.reviewedBy,
            reviewedAt: new Date(),
        })
        .where(
            and(
                eq(sourceDocuments.id, id),
                eq(sourceDocuments.organizationId, organizationId),
            ),
        )
        .returning();
    return row ?? null;
}
