import type { Graph, NodeType } from "@/core/knowledge/domain/types";

/** A node ready for the force canvas (force-graph mutates x/y/vx/vy at runtime). */
export type VizNode = {
    id: string;
    label: string;
    type: NodeType;
    origin: string;
    confidence: number;
    summary: string | null;
    personId: string | null;
    degree: number;
};

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
    "person",
    "vacancy",
];

/** Vivid, dark-canvas-friendly hues, one per node type. */
export const NODE_TYPE_COLORS: Record<NodeType, string> = {
    decision: "#f59e0b", // amber
    process: "#3b82f6", // blue (brand family)
    concept: "#8b5cf6", // violet
    document: "#10b981", // emerald
    person: "#ec4899", // pink
    vacancy: "#ef4444", // red — an open seat
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
    decision: "Decisión",
    process: "Proceso",
    concept: "Concepto",
    document: "Documento",
    person: "Persona",
    vacancy: "Vacante",
};

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
    const nodes: VizNode[] = graph.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        origin: n.origin,
        confidence: n.confidence,
        summary: n.summary,
        personId: n.personId,
        degree: degree.get(n.id) ?? 0,
    }));
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

export function filterByTypes(
    graph: VizGraph,
    active: Set<NodeType>,
): VizGraph {
    const nodes = graph.nodes.filter((n) => active.has(n.type));
    const kept = new Set(nodes.map((n) => n.id));
    const links = graph.links.filter(
        (l) => kept.has(l.source) && kept.has(l.target),
    );
    return { nodes, links };
}

export function filterByPerson(
    graph: VizGraph,
    personId: string | null,
): VizGraph {
    if (!personId) return graph;
    const nodes = graph.nodes.filter((n) => n.personId === personId);
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
        if (n.personId && !set.has(n.personId)) {
            set.add(n.personId);
            seen.push(n.personId);
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
