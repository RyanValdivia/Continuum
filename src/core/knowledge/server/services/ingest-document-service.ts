import "server-only";
import { createHash } from "node:crypto";
import { chunkText } from "@/core/knowledge/domain/chunk";
import type {
    IngestDocument,
    IngestResult,
} from "@/core/knowledge/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { type EmbedFn, googleEmbed } from "../embeddings/embed";
import { type ExtractFn, googleExtract } from "../extract/extract";
import { replaceDocumentChunks } from "../repository/chunks";
import { insertEdges, type NewEdge } from "../repository/edges";
import { insertNodes } from "../repository/nodes";
import { upsertSourceDocument } from "../repository/source-documents";

export interface IngestDeps {
    embed?: EmbedFn;
    extract?: ExtractFn;
}

/**
 * Source-agnostic ingestion: a connector (Notion, manual, …) hands over a
 * document's plain text; this chunks + embeds it, then optionally extracts a
 * knowledge subgraph. `deps` lets tests inject deterministic embed/extract.
 */
export async function ingestDocumentService(
    organizationId: string,
    input: IngestDocument,
    deps: IngestDeps = {},
): AsyncAppResult<IngestResult> {
    const embed = deps.embed ?? googleEmbed;
    const extract = deps.extract ?? googleExtract;

    try {
        const contentHash = createHash("sha256")
            .update(input.content)
            .digest("hex");

        const { row: document } = await upsertSourceDocument({
            organizationId,
            personId: input.personId,
            connector: input.connector,
            externalId: input.externalId,
            title: input.title,
            url: input.url,
            contentHash,
        });

        const textChunks = chunkText(input.content);
        const chunkEmbeddings = await embed(textChunks, "RETRIEVAL_DOCUMENT");
        const chunkRows = await replaceDocumentChunks({
            organizationId,
            documentId: document.id,
            personId: input.personId,
            chunks: textChunks.map((content, ord) => ({
                content,
                ord,
                embedding: chunkEmbeddings[ord],
            })),
        });

        let nodesCreated = 0;
        let edgesCreated = 0;

        if (input.extract) {
            const graph = await extract(input.content);

            if (graph.nodes.length > 0) {
                const nodeEmbeddings = await embed(
                    graph.nodes.map((n) =>
                        `${n.label}\n${n.summary ?? ""}`.trim(),
                    ),
                    "RETRIEVAL_DOCUMENT",
                );

                const insertedNodes = await insertNodes({
                    organizationId,
                    nodes: graph.nodes.map((n, i) => ({
                        personId: input.personId,
                        type: n.type,
                        label: n.label,
                        summary: n.summary ?? null,
                        embedding: nodeEmbeddings[i],
                        origin: "sync",
                    })),
                });
                nodesCreated = insertedNodes.length;

                const idByTempId = new Map(
                    graph.nodes.map((n, i) => [n.tempId, insertedNodes[i].id]),
                );

                const edges = graph.edges.reduce<NewEdge[]>((acc, e) => {
                    const fromNodeId = idByTempId.get(e.from);
                    const toNodeId = idByTempId.get(e.to);
                    // Drop edges referencing a tempId the model never defined,
                    // and self-loops.
                    if (fromNodeId && toNodeId && fromNodeId !== toNodeId) {
                        acc.push({ fromNodeId, toNodeId, type: e.type });
                    }
                    return acc;
                }, []);

                const insertedEdges = await insertEdges({
                    organizationId,
                    edges,
                });
                edgesCreated = insertedEdges.length;
            }
        }

        return ok({
            documentId: document.id,
            chunksCreated: chunkRows.length,
            nodesCreated,
            edgesCreated,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
