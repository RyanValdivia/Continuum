import "server-only";
import type {
    Graph,
    GraphNode,
    GraphQuery,
    KnowledgeEdge,
} from "@/core/knowledge/domain/types";
import { resolveAccessScope } from "@/server/authorization/resolve-access-scope";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { listGraph } from "../repository/graph";
import { findPersonPrincipalsByUserIds } from "../repository/person-principals";
import { toEdge, toNode } from "../repository/utils";

/**
 * A bounded slice of the org's knowledge graph for visualization, optionally
 * scoped to one person, and always scoped by the caller's ACL access token.
 * Merges in a `person` node (and a synthetic edge to each of their nodes)
 * for every distinct author among the returned knowledge nodes — the graph
 * shows people and knowledge as sibling node kinds without knowledge
 * ingestion or vector search ever treating a person as a node type.
 */
export async function getGraphService(
    organizationId: string,
    userId: string,
    params: GraphQuery,
): AsyncAppResult<Graph> {
    try {
        const scope = await resolveAccessScope(organizationId, userId);
        const { nodes, edges } = await listGraph({
            organizationId,
            personId: params.personId,
            limit: params.limit,
            scope,
        });

        const authorUserIds = [
            ...new Set(
                nodes
                    .map((n) => n.personId)
                    .filter((id): id is string => id !== null),
            ),
        ];
        const personPrincipals = await findPersonPrincipalsByUserIds({
            organizationId,
            userIds: authorUserIds,
        });
        const personNodeIdByUserId = new Map(
            personPrincipals.map((p) => [p.userId as string, p.id]),
        );

        const personNodes: GraphNode[] = personPrincipals
            .filter((p): p is typeof p & { userId: string } => p.userId !== null)
            .map((p) => ({
                kind: "person",
                id: p.id,
                label: p.name,
                userId: p.userId,
            }));
        const knowledgeNodes: GraphNode[] = nodes.map((n) => ({
            ...toNode(n),
            kind: "knowledge",
        }));

        const authorEdges: KnowledgeEdge[] = [];
        for (const n of nodes) {
            const personNodeId = n.personId
                ? personNodeIdByUserId.get(n.personId)
                : undefined;
            if (personNodeId) {
                authorEdges.push({
                    id: `authored-${personNodeId}-${n.id}`,
                    fromNodeId: personNodeId,
                    toNodeId: n.id,
                    type: "relates_to",
                    weight: 1,
                });
            }
        }

        return ok({
            nodes: [...personNodes, ...knowledgeNodes],
            edges: [...authorEdges, ...edges.map(toEdge)],
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
