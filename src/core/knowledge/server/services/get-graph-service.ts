import "server-only";
import type { Graph, GraphQuery } from "@/core/knowledge/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { listGraph } from "../repository/graph";
import { toEdge, toNode } from "../repository/utils";

/**
 * A bounded slice of the org's knowledge graph for visualization, optionally
 * scoped to one person.
 */
export async function getGraphService(
    organizationId: string,
    params: GraphQuery,
): AsyncAppResult<Graph> {
    try {
        const { nodes, edges } = await listGraph({
            organizationId,
            personId: params.personId,
            limit: params.limit,
        });
        return ok({ nodes: nodes.map(toNode), edges: edges.map(toEdge) });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
