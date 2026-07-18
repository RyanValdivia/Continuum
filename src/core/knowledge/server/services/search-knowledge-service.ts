import "server-only";
import type {
    ScoredChunk,
    ScoredNode,
    SearchKnowledge,
    SearchResult,
} from "@/core/knowledge/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { type EmbedFn, googleEmbed } from "../embeddings/embed";
import { searchChunks } from "../repository/chunks";
import { expandGraph } from "../repository/graph";
import { searchNodes } from "../repository/nodes";
import { toChunk, toEdge, toNode } from "../repository/utils";

export interface SearchDeps {
    embed?: EmbedFn;
}

/**
 * Hybrid retrieval: embed the query, pull the top chunks and nodes by cosine
 * similarity (org- and optionally person-scoped), then expand the matched nodes
 * `hops` deep through the graph. Chunks are the citations; nodes+edges are the
 * structured context. Vector-matched nodes keep their score; nodes reached only
 * by graph expansion have a null score.
 */
export async function searchKnowledgeService(
    organizationId: string,
    params: SearchKnowledge,
    deps: SearchDeps = {},
): AsyncAppResult<SearchResult> {
    const embed = deps.embed ?? googleEmbed;

    try {
        const [queryEmbedding] = await embed([params.query], "RETRIEVAL_QUERY");

        const [chunkHits, nodeHits] = await Promise.all([
            searchChunks({
                organizationId,
                queryEmbedding,
                personId: params.personId,
                limit: params.limit,
            }),
            searchNodes({
                organizationId,
                queryEmbedding,
                personId: params.personId,
                limit: params.limit,
            }),
        ]);

        const chunks: ScoredChunk[] = chunkHits.map(({ row, score }) => ({
            ...toChunk(row),
            score,
        }));

        const scoreByNodeId = new Map(
            nodeHits.map(({ row, score }) => [row.id, score]),
        );

        if (params.hops > 0 && nodeHits.length > 0) {
            const subgraph = await expandGraph({
                organizationId,
                seedNodeIds: nodeHits.map(({ row }) => row.id),
                hops: params.hops,
            });

            const nodes: ScoredNode[] = subgraph.nodes.map((row) => ({
                ...toNode(row),
                score: scoreByNodeId.get(row.id) ?? null,
            }));

            return ok({
                query: params.query,
                chunks,
                nodes,
                edges: subgraph.edges.map(toEdge),
            });
        }

        const nodes: ScoredNode[] = nodeHits.map(({ row, score }) => ({
            ...toNode(row),
            score,
        }));

        return ok({ query: params.query, chunks, nodes, edges: [] });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
