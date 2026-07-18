import "server-only";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type KnowledgeEdgeRow,
    type KnowledgeNodeRow,
    knowledgeEdges,
    knowledgeNodes,
} from "@/server/drizzle/schemas/knowledge-schema";
import { member } from "@/server/drizzle/schemas/organization-schema";

export interface Subgraph {
    nodes: KnowledgeNodeRow[];
    edges: KnowledgeEdgeRow[];
}

/**
 * Breadth-first graph expansion from seed nodes, up to `hops` deep, org-scoped.
 * Iterative rather than a recursive CTE: hop count is bounded (0–2) so a handful
 * of `inArray` queries is cheaper to reason about and fully typed. Returns every
 * reached node plus every edge traversed.
 */
export async function expandGraph(params: {
    organizationId: string;
    seedNodeIds: string[];
    hops: number;
}): Promise<Subgraph> {
    const visited = new Set(params.seedNodeIds);
    const edgesById = new Map<string, KnowledgeEdgeRow>();

    let frontier = params.seedNodeIds;
    for (let depth = 0; depth < params.hops && frontier.length > 0; depth++) {
        const edges = await db
            .select()
            .from(knowledgeEdges)
            .where(
                and(
                    eq(knowledgeEdges.organizationId, params.organizationId),
                    or(
                        inArray(knowledgeEdges.fromNodeId, frontier),
                        inArray(knowledgeEdges.toNodeId, frontier),
                    ),
                ),
            );

        const next: string[] = [];
        for (const edge of edges) {
            edgesById.set(edge.id, edge);
            for (const nodeId of [edge.fromNodeId, edge.toNodeId]) {
                if (!visited.has(nodeId)) {
                    visited.add(nodeId);
                    next.push(nodeId);
                }
            }
        }
        frontier = next;
    }

    const nodeIds = [...visited];
    const nodes = nodeIds.length
        ? await db
              .select()
              .from(knowledgeNodes)
              .where(
                  and(
                      eq(knowledgeNodes.organizationId, params.organizationId),
                      inArray(knowledgeNodes.id, nodeIds),
                  ),
              )
        : [];

    return { nodes, edges: [...edgesById.values()] };
}

/**
 * `person` nodes are never linked to the content they authored by a stored
 * edge — ingestion only ever creates edges between LLM-extracted content
 * nodes. A person node's id is `member.id` while a content node's
 * `personId` is the Continuum `user.id` (see `upsertPersonNodes` /
 * `ingest-document-service.ts`), so the two must be joined through `member`
 * to connect them. Synthesized here (not persisted) so it stays correct
 * regardless of whether the person node or the content existed first —
 * no backfill needed when someone is synced into the People page later.
 */
async function synthesizeAuthorshipEdges(
    organizationId: string,
    nodes: KnowledgeNodeRow[],
): Promise<KnowledgeEdgeRow[]> {
    const personNodes = nodes.filter((n) => n.type === "person");
    if (personNodes.length === 0) return [];

    const memberRows = await db
        .select({ id: member.id, userId: member.userId })
        .from(member)
        .where(
            and(
                eq(member.organizationId, organizationId),
                inArray(
                    member.id,
                    personNodes.map((n) => n.id),
                ),
            ),
        );
    const userIdByPersonNodeId = new Map(
        memberRows.map((m) => [m.id, m.userId]),
    );

    const edges: KnowledgeEdgeRow[] = [];
    for (const personNode of personNodes) {
        const userId = userIdByPersonNodeId.get(personNode.id);
        if (!userId) continue;
        for (const content of nodes) {
            if (content.type === "person" || content.type === "vacancy") {
                continue;
            }
            if (content.personId !== userId) continue;
            edges.push({
                id: `authored:${personNode.id}:${content.id}`,
                organizationId,
                fromNodeId: personNode.id,
                toNodeId: content.id,
                type: "relates_to",
                weight: 1,
                sourceChunkId: null,
                createdAt: content.createdAt,
            });
        }
    }
    return edges;
}

/**
 * A bounded slice of the org's graph for visualization: newest nodes (optionally
 * one person's), plus every edge whose endpoints are both in that slice, plus
 * synthesized person→content authorship edges (see `synthesizeAuthorshipEdges`).
 */
export async function listGraph(params: {
    organizationId: string;
    personId?: string | null;
    limit: number;
}): Promise<Subgraph> {
    const nodes = await db
        .select()
        .from(knowledgeNodes)
        .where(
            and(
                eq(knowledgeNodes.organizationId, params.organizationId),
                params.personId
                    ? eq(knowledgeNodes.personId, params.personId)
                    : undefined,
            ),
        )
        .orderBy(desc(knowledgeNodes.createdAt))
        .limit(params.limit);

    if (nodes.length === 0) return { nodes, edges: [] };

    const nodeIds = nodes.map((n) => n.id);
    const [edges, authorshipEdges] = await Promise.all([
        db
            .select()
            .from(knowledgeEdges)
            .where(
                and(
                    eq(knowledgeEdges.organizationId, params.organizationId),
                    inArray(knowledgeEdges.fromNodeId, nodeIds),
                    inArray(knowledgeEdges.toNodeId, nodeIds),
                ),
            ),
        synthesizeAuthorshipEdges(params.organizationId, nodes),
    ]);

    return { nodes, edges: [...edges, ...authorshipEdges] };
}
