import { describe, expect, it } from "vitest";
import type { Graph, KnowledgeGraphNode } from "@/core/knowledge/domain/types";
import {
    computeDegree,
    distinctPersonIds,
    filterByPerson,
    filterByTypes,
    filterPeople,
    matchNodeByLabel,
    NODE_TYPE_COLORS,
    NODE_TYPES,
    neighborIds,
    nodeRadius,
    PERSON_NODE_COLOR,
    toVizGraph,
} from "../graph-viz";

function node(
    id: string,
    over: Partial<KnowledgeGraphNode> = {},
): KnowledgeGraphNode {
    return {
        kind: "knowledge",
        id,
        personId: null,
        type: "concept",
        label: id,
        summary: null,
        sourceChunkId: null,
        origin: "manual",
        confidence: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        ...over,
    };
}

function personNode(
    id: string,
    over: Partial<{ label: string; userId: string }> = {},
): Graph["nodes"][number] {
    return {
        kind: "person",
        id,
        label: over.label ?? id,
        userId: over.userId ?? id,
    };
}
function edge(id: string, from: string, to: string): Graph["edges"][number] {
    return {
        id,
        fromNodeId: from,
        toNodeId: to,
        type: "relates_to",
        weight: 1,
    };
}

const sample: Graph = {
    nodes: [
        node("a", { type: "decision", personId: "p1", label: "Pricing" }),
        node("b", { type: "process", personId: "p2", label: "Onboarding" }),
        node("c", { type: "concept", personId: "p1", label: "ARR model" }),
    ],
    edges: [edge("e1", "a", "b"), edge("e2", "a", "c")],
};

describe("toVizGraph", () => {
    it("maps nodes/edges to viz shape with degree", () => {
        const g = toVizGraph(sample);
        expect(g.links).toEqual([
            { source: "a", target: "b", type: "relates_to", weight: 1 },
            { source: "a", target: "c", type: "relates_to", weight: 1 },
        ]);
        expect(g.nodes.find((n) => n.id === "a")?.degree).toBe(2);
        expect(g.nodes.find((n) => n.id === "b")?.degree).toBe(1);
    });
});

describe("computeDegree", () => {
    it("counts incident links per node", () => {
        const g = toVizGraph(sample);
        const d = computeDegree(g.nodes, g.links);
        expect(d.get("a")).toBe(2);
        expect(d.get("c")).toBe(1);
    });
});

describe("nodeRadius", () => {
    it("grows with degree but is bounded and monotonic", () => {
        expect(nodeRadius(0)).toBeLessThan(nodeRadius(5));
        expect(nodeRadius(5)).toBeLessThan(nodeRadius(50));
        expect(nodeRadius(1000)).toBeLessThanOrEqual(nodeRadius(1000) + 1);
        expect(nodeRadius(1000)).toBeLessThan(30);
    });
});

describe("neighborIds", () => {
    it("returns direct neighbors of a node (both directions)", () => {
        const g = toVizGraph(sample);
        expect(neighborIds(g.links, "a")).toEqual(new Set(["b", "c"]));
        expect(neighborIds(g.links, "b")).toEqual(new Set(["a"]));
    });
});

describe("filterByTypes", () => {
    it("keeps only active-type nodes and links between survivors", () => {
        const g = toVizGraph(sample);
        const out = filterByTypes(g, new Set(["decision", "process"]));
        expect(out.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
        expect(out.links).toEqual([
            { source: "a", target: "b", type: "relates_to", weight: 1 },
        ]);
    });
});

describe("filterByPerson", () => {
    it("null personId returns the whole graph", () => {
        const g = toVizGraph(sample);
        expect(filterByPerson(g, null).nodes.length).toBe(3);
    });
    it("scopes to one person and drops dangling links", () => {
        const g = toVizGraph(sample);
        const out = filterByPerson(g, "p1");
        expect(out.nodes.map((n) => n.id).sort()).toEqual(["a", "c"]);
        expect(out.links).toEqual([
            { source: "a", target: "c", type: "relates_to", weight: 1 },
        ]);
    });
});

describe("distinctPersonIds", () => {
    it("returns unique non-null personIds in first-seen order", () => {
        const g = toVizGraph(sample);
        expect(distinctPersonIds(g.nodes)).toEqual(["p1", "p2"]);
    });
});

describe("matchNodeByLabel", () => {
    it("case-insensitive substring match, null when none/blank", () => {
        const g = toVizGraph(sample);
        expect(matchNodeByLabel(g.nodes, "onboard")?.id).toBe("b");
        expect(matchNodeByLabel(g.nodes, "  ")).toBeNull();
        expect(matchNodeByLabel(g.nodes, "zzz")).toBeNull();
    });
});

describe("NODE_TYPE_COLORS", () => {
    it("has a color for every node type", () => {
        for (const t of NODE_TYPES) {
            expect(NODE_TYPE_COLORS[t]).toMatch(/^#[0-9a-f]{6}$/i);
        }
    });
});

describe("PERSON_NODE_COLOR", () => {
    it("is a valid hex color", () => {
        expect(PERSON_NODE_COLOR).toMatch(/^#[0-9a-f]{6}$/i);
    });
});

const withPeople: Graph = {
    nodes: [
        ...sample.nodes,
        personNode("person-1", { label: "Ada", userId: "p1" }),
        personNode("person-2", { label: "Grace", userId: "p2" }),
    ],
    edges: [
        ...sample.edges,
        edge("e3", "person-1", "a"),
        edge("e4", "person-2", "b"),
    ],
};

describe("person nodes", () => {
    it("toVizGraph carries kind + userId, no knowledge-only fields", () => {
        const g = toVizGraph(withPeople);
        const p = g.nodes.find((n) => n.id === "person-1");
        expect(p).toEqual({
            kind: "person",
            id: "person-1",
            label: "Ada",
            userId: "p1",
            degree: 1,
        });
    });

    it("filterByTypes always keeps person nodes regardless of active types", () => {
        const g = toVizGraph(withPeople);
        const out = filterByTypes(g, new Set(["decision"]));
        expect(out.nodes.some((n) => n.kind === "person")).toBe(true);
        expect(out.nodes.map((n) => n.id).sort()).toEqual([
            "a",
            "person-1",
            "person-2",
        ]);
    });

    it("filterByPerson matches a person node by its own userId, not its node id", () => {
        const g = toVizGraph(withPeople);
        const out = filterByPerson(g, "p1");
        expect(out.nodes.map((n) => n.id).sort()).toEqual(["a", "c", "person-1"]);
    });

    it("distinctPersonIds includes person nodes' userId", () => {
        const g = toVizGraph(withPeople);
        expect(distinctPersonIds(g.nodes)).toEqual(["p1", "p2"]);
    });

    it("filterPeople(false) drops every person node and dangling links", () => {
        const g = toVizGraph(withPeople);
        const out = filterPeople(g, false);
        expect(out.nodes.some((n) => n.kind === "person")).toBe(false);
        expect(out.links).toEqual([
            { source: "a", target: "b", type: "relates_to", weight: 1 },
            { source: "a", target: "c", type: "relates_to", weight: 1 },
        ]);
    });

    it("filterPeople(true) is a no-op", () => {
        const g = toVizGraph(withPeople);
        expect(filterPeople(g, true)).toEqual(g);
    });
});
