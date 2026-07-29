import type { ReactElement } from "react";
import {
    DECISION_ROUTE_NODE_IDS,
    GRAPH_CLUSTERS,
    type GraphCluster,
    LANDING_GRAPH_EDGES,
    LANDING_GRAPH_NODES,
    type LandingGraphEdge,
    type LandingGraphNode,
    PHASE_FOUR_NODE_ID,
} from "./stage-screen-data";

const nodesById = new Map(
    LANDING_GRAPH_NODES.map((node) => [node.id, node] as const),
);

const CLUSTER_NODE_CLASSES: Record<GraphCluster, string> = {
    person: "fill-primary/20 stroke-primary",
    decision: "fill-brand-chord/20 stroke-brand-chord",
    document: "fill-card stroke-primary/70",
    criterion: "fill-secondary stroke-brand-chord/70",
};

function endpoints(edge: LandingGraphEdge) {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    if (!source || !target) throw new Error(`Invalid edge ${edge.id}`);
    return { source, target };
}

function GraphEdge({ edge }: { edge: LandingGraphEdge }): ReactElement {
    const { source, target } = endpoints(edge);
    return (
        <line
            data-graph-edge={edge.id}
            data-decision-route={edge.decisionRoute ? "true" : undefined}
            data-phase-four-edge={
                edge.introducedInPhase === 4 ? "true" : undefined
            }
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            className="stroke-border"
            vectorEffect="non-scaling-stroke"
        />
    );
}

function GraphNode({ node }: { node: LandingGraphNode }): ReactElement {
    return (
        <g
            data-graph-node={node.id}
            data-phase-four-node={
                node.id === PHASE_FOUR_NODE_ID ? "true" : undefined
            }
        >
            <circle
                cx={node.x}
                cy={node.y}
                r={node.radius / 4}
                className={
                    node.hub
                        ? `${CLUSTER_NODE_CLASSES[node.cluster]} stroke-[1.6]`
                        : CLUSTER_NODE_CLASSES[node.cluster]
                }
                vectorEffect="non-scaling-stroke"
            />
            {node.label ? (
                <text
                    x={node.x}
                    y={node.y - node.radius / 3}
                    textAnchor="middle"
                    className="fill-foreground font-mono text-[2.2px]"
                >
                    {node.label}
                </text>
            ) : null}
        </g>
    );
}

function edgesForCluster(cluster: GraphCluster) {
    return LANDING_GRAPH_EDGES.filter((edge) => {
        const { source, target } = endpoints(edge);
        return source.cluster === cluster && target.cluster === cluster;
    });
}

const CROSS_CLUSTER_EDGES = LANDING_GRAPH_EDGES.filter((edge) => {
    const { source, target } = endpoints(edge);
    return source.cluster !== target.cluster;
});

export function StageScreenGraph(): ReactElement {
    const routeStart = nodesById.get(DECISION_ROUTE_NODE_IDS[0]);
    if (!routeStart) throw new Error("Missing decision route start");

    return (
        <svg
            data-graph-camera
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="size-full overflow-visible"
        >
            <g data-graph-cross-edges>
                {CROSS_CLUSTER_EDGES.map((edge) => (
                    <GraphEdge key={edge.id} edge={edge} />
                ))}
            </g>
            {GRAPH_CLUSTERS.map((cluster) => {
                const nodes = LANDING_GRAPH_NODES.filter(
                    (node) => node.cluster === cluster,
                );
                const hub = nodes.find((node) => node.hub);
                if (!hub) throw new Error(`Missing hub for ${cluster}`);
                return (
                    <g
                        key={cluster}
                        data-graph-cluster={cluster}
                        style={{ transformOrigin: `${hub.x}px ${hub.y}px` }}
                    >
                        {edgesForCluster(cluster).map((edge) => (
                            <GraphEdge key={edge.id} edge={edge} />
                        ))}
                        {nodes.map((node) => (
                            <GraphNode key={node.id} node={node} />
                        ))}
                    </g>
                );
            })}
            <circle
                data-decision-particle
                cx={routeStart.x}
                cy={routeStart.y}
                r="1.2"
                className="fill-brand-chord"
            />
        </svg>
    );
}
