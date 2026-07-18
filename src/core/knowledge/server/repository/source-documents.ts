import "server-only";
import { and, eq } from "drizzle-orm";
import type { Connector } from "@/core/knowledge/domain/types";
import { db } from "@/server/drizzle/db";
import {
    type SourceDocumentRow,
    sourceDocuments,
} from "@/server/drizzle/schemas/knowledge-schema";

export interface UpsertSourceDocumentInput {
    organizationId: string;
    personId?: string | null;
    connector: Connector;
    externalId: string;
    title: string;
    url?: string | null;
    contentHash: string;
}

/**
 * Insert a source document, or update it in place when the same
 * (org, connector, externalId) is re-synced. Returns the row and whether the
 * content changed since last sync — callers skip re-embedding unchanged docs.
 */
export async function upsertSourceDocument(
    input: UpsertSourceDocumentInput,
): Promise<{ row: SourceDocumentRow; contentChanged: boolean }> {
    const existing = await db
        .select({ contentHash: sourceDocuments.contentHash })
        .from(sourceDocuments)
        .where(
            and(
                eq(sourceDocuments.organizationId, input.organizationId),
                eq(sourceDocuments.connector, input.connector),
                eq(sourceDocuments.externalId, input.externalId),
            ),
        )
        .limit(1);

    const contentChanged =
        existing.length === 0 || existing[0].contentHash !== input.contentHash;

    const [row] = await db
        .insert(sourceDocuments)
        .values({
            organizationId: input.organizationId,
            personId: input.personId ?? null,
            connector: input.connector,
            externalId: input.externalId,
            title: input.title,
            url: input.url ?? null,
            contentHash: input.contentHash,
            lastSeenAt: new Date(),
        })
        .onConflictDoUpdate({
            target: [
                sourceDocuments.organizationId,
                sourceDocuments.connector,
                sourceDocuments.externalId,
            ],
            set: {
                personId: input.personId ?? null,
                title: input.title,
                url: input.url ?? null,
                contentHash: input.contentHash,
                lastSeenAt: new Date(),
                updatedAt: new Date(),
            },
        })
        .returning();

    return { row, contentChanged };
}
