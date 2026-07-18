import "server-only";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { buildAccessPredicate } from "@/server/authorization/build-access-predicate";
import type { AccessScope } from "@/server/authorization/resolve-access-scope";
import { db } from "@/server/drizzle/db";
import {
    type KnowledgeEdgeRow,
    type KnowledgeNodeRow,
    knowledgeEdges,
    knowledgeNodes,
} from "@/server/drizzle/schemas/knowledge-schema";

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
    scope: AccessScope;
}): Promise<Subgraph> {
    const visited = new Set(params.seedNodeIds);
    const edgesById = new Map<string, KnowledgeEdgeRow>();

    const nodeAccess = (column: PgColumn) =>
        buildAccessPredicate({
            accessToken: params.scope.accessToken,
            defaultAccess: params.scope.defaultAccess,
            resourceType: "knowledge_node",
            resourceIdColumn: column,
        });

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
                    // Both endpoints must be individually visible — an edge
                    // through a denied node is never traversed or returned.
                    nodeAccess(knowledgeEdges.fromNodeId),
                    nodeAccess(knowledgeEdges.toNodeId),
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
                      nodeAccess(knowledgeNodes.id),
                  ),
              )
        : [];

    return { nodes, edges: [...edgesById.values()] };
}

/**
 * A bounded slice of the org's graph for visualization: newest nodes (optionally
 * one person's), plus every edge whose endpoints are both in that slice.
 */
export async function listGraph(params: {
    organizationId: string;
    personId?: string | null;
    limit: number;
    scope: AccessScope;
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
                buildAccessPredicate({
                    accessToken: params.scope.accessToken,
                    defaultAccess: params.scope.defaultAccess,
                    resourceType: "knowledge_node",
                    resourceIdColumn: knowledgeNodes.id,
                }),
            ),
        )
        .orderBy(desc(knowledgeNodes.createdAt))
        .limit(params.limit);

    if (nodes.length === 0) return { nodes, edges: [] };

    const nodeIds = nodes.map((n) => n.id);
    const edges = await db
        .select()
        .from(knowledgeEdges)
        .where(
            and(
                eq(knowledgeEdges.organizationId, params.organizationId),
                inArray(knowledgeEdges.fromNodeId, nodeIds),
                inArray(knowledgeEdges.toNodeId, nodeIds),
            ),
        );

    return { nodes, edges };
}
