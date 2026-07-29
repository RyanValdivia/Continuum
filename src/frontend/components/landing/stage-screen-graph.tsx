import type { ReactElement } from "react";
import {
    DECISION_ROUTE_NODE_IDS,
    GRAPH_CLUSTERS,
    type GraphCluster,
    LANDING_GRAPH_EDGES,
    LANDING_GRAPH_NODES,
    type LandingGraphEdge,
    type LandingGraphNode,
    PHASE_FOUR_NODE_IDS,
} from "./stage-screen-data";

const nodesById = new Map(
    LANDING_GRAPH_NODES.map((node) => [node.id, node] as const),
);

// Every fill is a translucent tint of its cluster's own hue. Opaque surface
// tokens (`fill-card`, `fill-secondary`) are near-black in the dark theme and
// read as holes punched through the shader rather than as nodes.
const CLUSTER_NODE_CLASSES: Record<GraphCluster, string> = {
    person: "fill-primary/20 stroke-primary",
    decision: "fill-brand-chord/20 stroke-brand-chord",
    document: "fill-primary/10 stroke-primary/70",
    criterion: "fill-brand-chord/10 stroke-brand-chord/70",
};

function endpoints(edge: LandingGraphEdge) {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    if (!source || !target) throw new Error(`Invalid edge ${edge.id}`);
    return { source, target };
}

function signalOrderOf(id: string): number {
    return PHASE_FOUR_NODE_IDS.indexOf(
        id as (typeof PHASE_FOUR_NODE_IDS)[number],
    );
}

function GraphEdge({ edge }: { edge: LandingGraphEdge }): ReactElement {
    const { source, target } = endpoints(edge);
    // An edge belongs to whichever signal it hangs off, so it can be revealed
    // in the same beat as its node rather than with the whole batch.
    const signalOrder = Math.max(
        signalOrderOf(edge.source),
        signalOrderOf(edge.target),
    );

    return (
        <line
            data-graph-edge={edge.id}
            data-decision-route={edge.decisionRoute ? "true" : undefined}
            data-phase-four-edge={
                edge.introducedInPhase === 4 ? "true" : undefined
            }
            data-signal-order={signalOrder >= 0 ? signalOrder : undefined}
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
    const signalOrder = signalOrderOf(node.id);

    return (
        <g
            data-graph-node={node.id}
            data-phase-four-node={signalOrder >= 0 ? "true" : undefined}
            // Lets the loop admit the signals one at a time, in a fixed order.
            data-signal-order={signalOrder >= 0 ? signalOrder : undefined}
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
                        // The cluster turns and converges around its hub rather
                        // than around its bounding box. The choreography reads
                        // these to set GSAP's `svgOrigin` — a CSS
                        // `transform-origin` is ignored on SVG elements, which
                        // silently leaves each cluster short of the centre.
                        data-hub-x={hub.x}
                        data-hub-y={hub.y}
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
