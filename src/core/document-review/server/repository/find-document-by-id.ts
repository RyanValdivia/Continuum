import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type SourceDocumentRow,
    sourceDocuments,
} from "@/server/drizzle/schemas/knowledge-schema";

export async function findDocumentById(
    id: string,
    organizationId: string,
): Promise<SourceDocumentRow | null> {
    const [row] = await db
        .select()
        .from(sourceDocuments)
        .where(
            and(
                eq(sourceDocuments.id, id),
                eq(sourceDocuments.organizationId, organizationId),
            ),
        )
        .limit(1);
    return row ?? null;
}
