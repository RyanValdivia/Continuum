export const GRAPH_CLUSTERS = [
    "person",
    "decision",
    "document",
    "criterion",
] as const;

export type GraphCluster = (typeof GRAPH_CLUSTERS)[number];

export type LandingGraphNode = {
    id: string;
    cluster: GraphCluster;
    label?: string;
    radius: number;
    x: number;
    y: number;
    hub?: boolean;
    introducedInPhase?: 2 | 4;
};

export type LandingGraphEdge = {
    id: string;
    source: LandingGraphNode["id"];
    target: LandingGraphNode["id"];
    decisionRoute?: boolean;
    introducedInPhase?: 2 | 4;
};

export type { SourceMark, SourceVisual } from "./stage-source-data";
export { LANDING_SOURCES } from "./stage-source-data";

export const PHASE_FOUR_NODE_ID = "document-new-signal";

export const DECISION_ROUTE_NODE_IDS = [
    "person-founder",
    "decision-launch",
    "document-strategy",
    "criterion-market",
] as const;

export const LANDING_GRAPH_NODES: readonly LandingGraphNode[] = [
    {
        id: "person-founder",
        cluster: "person",
        label: "Personas",
        radius: 14,
        x: 31,
        y: 29,
        hub: true,
        introducedInPhase: 2,
    },
    {
        id: "person-product",
        cluster: "person",
        radius: 8,
        x: 20,
        y: 18,
        introducedInPhase: 2,
    },
    {
        id: "person-engineering",
        cluster: "person",
        radius: 7,
        x: 40,
        y: 12,
        introducedInPhase: 2,
    },
    {
        id: "person-people",
        cluster: "person",
        radius: 6,
        x: 15,
        y: 35,
        introducedInPhase: 2,
    },
    {
        id: "person-sales",
        cluster: "person",
        radius: 8,
        x: 38,
        y: 38,
        introducedInPhase: 2,
    },
    {
        id: "person-ops",
        cluster: "person",
        radius: 5,
        x: 10,
        y: 22,
        introducedInPhase: 2,
    },
    {
        id: "person-design",
        cluster: "person",
        radius: 6,
        x: 28,
        y: 45,
        introducedInPhase: 2,
    },
    {
        id: "person-customer",
        cluster: "person",
        radius: 5,
        x: 46,
        y: 25,
        introducedInPhase: 2,
    },
    {
        id: "decision-launch",
        cluster: "decision",
        label: "Decisiones",
        radius: 15,
        x: 69,
        y: 28,
        hub: true,
        introducedInPhase: 2,
    },
    {
        id: "decision-pricing",
        cluster: "decision",
        radius: 7,
        x: 58,
        y: 13,
        introducedInPhase: 2,
    },
    {
        id: "decision-hiring",
        cluster: "decision",
        radius: 6,
        x: 78,
        y: 11,
        introducedInPhase: 2,
    },
    {
        id: "decision-roadmap",
        cluster: "decision",
        radius: 8,
        x: 88,
        y: 27,
        introducedInPhase: 2,
    },
    {
        id: "decision-policy",
        cluster: "decision",
        radius: 7,
        x: 73,
        y: 43,
        introducedInPhase: 2,
    },
    {
        id: "decision-budget",
        cluster: "decision",
        radius: 6,
        x: 56,
        y: 34,
        introducedInPhase: 2,
    },
    {
        id: "decision-market",
        cluster: "decision",
        radius: 5,
        x: 91,
        y: 43,
        introducedInPhase: 2,
    },
    {
        id: "decision-scope",
        cluster: "decision",
        radius: 5,
        x: 66,
        y: 21,
        introducedInPhase: 2,
    },
    {
        id: "document-strategy",
        cluster: "document",
        label: "Documentos",
        radius: 15,
        x: 70,
        y: 70,
        hub: true,
        introducedInPhase: 2,
    },
    {
        id: "document-prd",
        cluster: "document",
        radius: 8,
        x: 57,
        y: 61,
        introducedInPhase: 2,
    },
    {
        id: "document-policy",
        cluster: "document",
        radius: 7,
        x: 84,
        y: 57,
        introducedInPhase: 2,
    },
    {
        id: "document-research",
        cluster: "document",
        radius: 6,
        x: 91,
        y: 72,
        introducedInPhase: 2,
    },
    {
        id: "document-plan",
        cluster: "document",
        radius: 7,
        x: 75,
        y: 88,
        introducedInPhase: 2,
    },
    {
        id: "document-notes",
        cluster: "document",
        radius: 5,
        x: 58,
        y: 81,
        introducedInPhase: 2,
    },
    {
        id: "document-financial",
        cluster: "document",
        radius: 5,
        x: 89,
        y: 88,
        introducedInPhase: 2,
    },
    {
        id: PHASE_FOUR_NODE_ID,
        cluster: "document",
        radius: 6,
        x: 97,
        y: 79,
        introducedInPhase: 4,
    },
    {
        id: "criterion-market",
        cluster: "criterion",
        label: "Criterios",
        radius: 14,
        x: 31,
        y: 72,
        hub: true,
        introducedInPhase: 2,
    },
    {
        id: "criterion-customer",
        cluster: "criterion",
        radius: 7,
        x: 18,
        y: 60,
        introducedInPhase: 2,
    },
    {
        id: "criterion-risk",
        cluster: "criterion",
        radius: 6,
        x: 42,
        y: 58,
        introducedInPhase: 2,
    },
    {
        id: "criterion-quality",
        cluster: "criterion",
        radius: 8,
        x: 48,
        y: 74,
        introducedInPhase: 2,
    },
    {
        id: "criterion-speed",
        cluster: "criterion",
        radius: 7,
        x: 36,
        y: 90,
        introducedInPhase: 2,
    },
    {
        id: "criterion-cost",
        cluster: "criterion",
        radius: 6,
        x: 16,
        y: 84,
        introducedInPhase: 2,
    },
    {
        id: "criterion-culture",
        cluster: "criterion",
        radius: 5,
        x: 6,
        y: 70,
        introducedInPhase: 2,
    },
    {
        id: "criterion-compliance",
        cluster: "criterion",
        radius: 5,
        x: 26,
        y: 51,
        introducedInPhase: 2,
    },
];

const NODE_IDS_BY_CLUSTER: Record<GraphCluster, readonly string[]> = {
    person: LANDING_GRAPH_NODES.filter((node) => node.cluster === "person").map(
        (node) => node.id,
    ),
    decision: LANDING_GRAPH_NODES.filter(
        (node) => node.cluster === "decision",
    ).map((node) => node.id),
    document: LANDING_GRAPH_NODES.filter(
        (node) => node.cluster === "document",
    ).map((node) => node.id),
    criterion: LANDING_GRAPH_NODES.filter(
        (node) => node.cluster === "criterion",
    ).map((node) => node.id),
};

const CHORD_INDEXES = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 0],
] as const;

function phaseForEdge(source: string, target: string): 2 | 4 {
    return source === PHASE_FOUR_NODE_ID || target === PHASE_FOUR_NODE_ID
        ? 4
        : 2;
}

const INTRA_CLUSTER_EDGES = GRAPH_CLUSTERS.flatMap((cluster) => {
    const [hub, ...peripheral] = NODE_IDS_BY_CLUSTER[cluster];
    if (!hub) throw new Error(`Missing hub for ${cluster}`);

    const spokes = peripheral.map(
        (nodeId) =>
            ({
                id: `${cluster}-hub-${nodeId}`,
                source: hub,
                target: nodeId,
                introducedInPhase: phaseForEdge(hub, nodeId),
            }) satisfies LandingGraphEdge,
    );

    const chords = CHORD_INDEXES.map(([sourceIndex, targetIndex]) => {
        const source = peripheral[sourceIndex];
        const target = peripheral[targetIndex];
        if (!source || !target) {
            throw new Error(`Missing chord endpoint for ${cluster}`);
        }
        return {
            id: `${cluster}-chord-${sourceIndex}-${targetIndex}`,
            source,
            target,
            introducedInPhase: phaseForEdge(source, target),
        } satisfies LandingGraphEdge;
    });

    return [...spokes, ...chords];
});

const CROSS_CLUSTER_EDGES: readonly LandingGraphEdge[] = [
    {
        id: "route-person-decision",
        source: "person-founder",
        target: "decision-launch",
        decisionRoute: true,
        introducedInPhase: 2,
    },
    {
        id: "route-decision-document",
        source: "decision-launch",
        target: "document-strategy",
        decisionRoute: true,
        introducedInPhase: 2,
    },
    {
        id: "route-document-criterion",
        source: "document-strategy",
        target: "criterion-market",
        decisionRoute: true,
        introducedInPhase: 2,
    },
    {
        id: "route-criterion-person",
        source: "criterion-market",
        target: "person-founder",
        decisionRoute: true,
        introducedInPhase: 2,
    },
    {
        id: "cross-person-document",
        source: "person-product",
        target: "document-prd",
        introducedInPhase: 2,
    },
    {
        id: "cross-decision-criterion",
        source: "decision-budget",
        target: "criterion-cost",
        introducedInPhase: 2,
    },
    {
        id: "phase-four-document-criterion",
        source: PHASE_FOUR_NODE_ID,
        target: "criterion-quality",
        introducedInPhase: 4,
    },
];

export const LANDING_GRAPH_EDGES: readonly LandingGraphEdge[] = [
    ...INTRA_CLUSTER_EDGES,
    ...CROSS_CLUSTER_EDGES,
];
