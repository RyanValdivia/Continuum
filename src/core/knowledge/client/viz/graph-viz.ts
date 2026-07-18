import type { Graph, NodeType } from "@/core/knowledge/domain/types";

/** A node ready for the force canvas (force-graph mutates x/y/vx/vy at runtime). */
export type VizKnowledgeNode = {
    kind: "knowledge";
    id: string;
    label: string;
    type: NodeType;
    origin: string;
    confidence: number;
    summary: string | null;
    personId: string | null;
    degree: number;
};

export type VizPersonNode = {
    kind: "person";
    id: string;
    label: string;
    /** Ties this node back to the knowledge it authored — knowledge nodes'
     *  `personId` attribution is this same value. */
    userId: string;
    degree: number;
};

export type VizNode = VizKnowledgeNode | VizPersonNode;

/** A link; `source`/`target` are node ids before the sim resolves them to refs. */
export type VizLink = {
    source: string;
    target: string;
    type: string;
    weight: number;
};

export type VizGraph = { nodes: VizNode[]; links: VizLink[] };

export const NODE_TYPES: NodeType[] = [
    "decision",
    "process",
    "concept",
    "document",
];

/** Vivid, dark-canvas-friendly hues, one per node type. */
export const NODE_TYPE_COLORS: Record<NodeType, string> = {
    decision: "#f59e0b", // amber
    process: "#3b82f6", // blue (brand family)
    concept: "#8b5cf6", // violet
    document: "#10b981", // emerald
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
    decision: "Decisión",
    process: "Proceso",
    concept: "Concepto",
    document: "Documento",
};

/** Distinct from `NODE_TYPE_COLORS`/`NODE_TYPE_LABELS` — a `person` node
 *  isn't a `NodeType`, it's the graph's other node kind (see `graph-viz`'s
 *  `VizNode` union and the domain's `graphNodeSchema`). */
export const PERSON_NODE_COLOR = "#ec4899"; // pink
export const PERSON_NODE_LABEL = "Persona";

export function computeDegree(
    nodes: Pick<VizNode, "id">[],
    links: VizLink[],
): Map<string, number> {
    const degree = new Map<string, number>();
    for (const n of nodes) degree.set(n.id, 0);
    for (const l of links) {
        degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
        degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    }
    return degree;
}

/** Radius in px: grows with sqrt(degree), bounded so hubs never dominate. */
export function nodeRadius(degree: number): number {
    return 4 + Math.min(Math.sqrt(Math.max(degree, 0)) * 2.2, 14);
}

export function toVizGraph(graph: Graph): VizGraph {
    const links: VizLink[] = graph.edges.map((e) => ({
        source: e.fromNodeId,
        target: e.toNodeId,
        type: e.type,
        weight: e.weight,
    }));
    const degree = computeDegree(graph.nodes, links);
    const nodes: VizNode[] = graph.nodes.map((n) => {
        const deg = degree.get(n.id) ?? 0;
        if (n.kind === "person") {
            return {
                kind: "person",
                id: n.id,
                label: n.label,
                userId: n.userId,
                degree: deg,
            };
        }
        return {
            kind: "knowledge",
            id: n.id,
            label: n.label,
            type: n.type,
            origin: n.origin,
            confidence: n.confidence,
            summary: n.summary,
            personId: n.personId,
            degree: deg,
        };
    });
    return { nodes, links };
}

/** ids of nodes directly linked to `nodeId` (either direction). */
export function neighborIds(links: VizLink[], nodeId: string): Set<string> {
    const out = new Set<string>();
    for (const l of links) {
        if (l.source === nodeId) out.add(l.target);
        else if (l.target === nodeId) out.add(l.source);
    }
    return out;
}

/** Hides/shows `person` nodes as a whole — the legend's dedicated toggle,
 *  independent of the per-type toggles which only apply to knowledge nodes. */
export function filterPeople(graph: VizGraph, show: boolean): VizGraph {
    if (show) return graph;
    const nodes = graph.nodes.filter((n) => n.kind !== "person");
    const kept = new Set(nodes.map((n) => n.id));
    const links = graph.links.filter(
        (l) => kept.has(l.source) && kept.has(l.target),
    );
    return { nodes, links };
}

/** Type toggles only ever apply to knowledge nodes — person nodes always
 *  pass through; there's no "type" to filter them by. */
export function filterByTypes(
    graph: VizGraph,
    active: Set<NodeType>,
): VizGraph {
    const nodes = graph.nodes.filter(
        (n) => n.kind === "person" || active.has(n.type),
    );
    const kept = new Set(nodes.map((n) => n.id));
    const links = graph.links.filter(
        (l) => kept.has(l.source) && kept.has(l.target),
    );
    return { nodes, links };
}

/** Scopes to one person's authored knowledge, plus that person's own node
 *  (matched by `userId`, not the knowledge nodes' `id`). */
export function filterByPerson(
    graph: VizGraph,
    personId: string | null,
): VizGraph {
    if (!personId) return graph;
    const nodes = graph.nodes.filter((n) =>
        n.kind === "person"
            ? n.userId === personId
            : n.personId === personId,
    );
    const kept = new Set(nodes.map((n) => n.id));
    const links = graph.links.filter(
        (l) => kept.has(l.source) && kept.has(l.target),
    );
    return { nodes, links };
}

export function distinctPersonIds(nodes: VizNode[]): string[] {
    const seen: string[] = [];
    const set = new Set<string>();
    for (const n of nodes) {
        const personId = n.kind === "person" ? n.userId : n.personId;
        if (personId && !set.has(personId)) {
            set.add(personId);
            seen.push(personId);
        }
    }
    return seen;
}

export function matchNodeByLabel(
    nodes: VizNode[],
    query: string,
): VizNode | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return nodes.find((n) => n.label.toLowerCase().includes(q)) ?? null;
}
