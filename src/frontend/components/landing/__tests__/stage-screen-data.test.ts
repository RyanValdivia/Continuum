import { describe, expect, it } from "vitest";
import {
    GRAPH_CLUSTERS,
    LANDING_GRAPH_EDGES,
    LANDING_GRAPH_NODES,
    LANDING_SOURCES,
    PHASE_FOUR_NODE_IDS,
} from "../stage-screen-data";

const APPROVED_PROVIDERS = [
    "documents",
    "microsoft-365",
    "notion",
    "slack",
] as const;

describe("landing constellation data", () => {
    it("uses only approved provider brands at the required density", () => {
        const providers = LANDING_SOURCES.filter(
            (source) => source.kind === "provider",
        )
            .map((source) => source.mark)
            .sort();

        expect(LANDING_SOURCES.length).toBeGreaterThanOrEqual(12);
        expect(LANDING_SOURCES.length).toBeLessThanOrEqual(16);
        expect(providers).toEqual(APPROVED_PROVIDERS);
        expect(
            LANDING_SOURCES.some((source) => source.label.includes("Outlook")),
        ).toBe(false);
    });

    it("defines a stable four-cluster graph", () => {
        const ids = LANDING_GRAPH_NODES.map((node) => node.id);
        const clusters = new Set(
            LANDING_GRAPH_NODES.map((node) => node.cluster),
        );

        expect(new Set(ids).size).toBe(ids.length);
        expect(LANDING_GRAPH_NODES).toHaveLength(35);
        expect(LANDING_GRAPH_EDGES.length).toBeGreaterThanOrEqual(44);
        expect(LANDING_GRAPH_EDGES.length).toBeLessThanOrEqual(62);
        expect([...clusters].sort()).toEqual([...GRAPH_CLUSTERS].sort());
    });

    it("keeps every edge endpoint valid", () => {
        const ids = new Set(LANDING_GRAPH_NODES.map((node) => node.id));

        for (const edge of LANDING_GRAPH_EDGES) {
            expect(ids.has(edge.source), edge.id).toBe(true);
            expect(ids.has(edge.target), edge.id).toBe(true);
        }
    });

    it("routes decisions through every cluster", () => {
        const nodes = new Map(
            LANDING_GRAPH_NODES.map((node) => [node.id, node] as const),
        );
        const routeClusters = new Set(
            LANDING_GRAPH_EDGES.filter((edge) => edge.decisionRoute).flatMap(
                (edge) => [
                    nodes.get(edge.source)?.cluster,
                    nodes.get(edge.target)?.cluster,
                ],
            ),
        );

        expect(routeClusters).toEqual(new Set(GRAPH_CLUSTERS));
    });

    it("integrates every phase-four node through hub and cross-cluster edges", () => {
        const nodes = new Map(
            LANDING_GRAPH_NODES.map((node) => [node.id, node] as const),
        );

        for (const id of PHASE_FOUR_NODE_IDS) {
            const newNode = nodes.get(id);
            const connected = LANDING_GRAPH_EDGES.filter(
                (edge) =>
                    edge.introducedInPhase === 4 &&
                    (edge.source === id || edge.target === id),
            );
            const partnerOf = (edge: { source: string; target: string }) =>
                nodes.get(edge.source === id ? edge.target : edge.source);

            expect(newNode?.introducedInPhase).toBe(4);
            expect(connected.length).toBeGreaterThanOrEqual(2);
            expect(
                connected.some((edge) => partnerOf(edge)?.hub === true),
            ).toBe(true);
            expect(
                connected.some(
                    (edge) => partnerOf(edge)?.cluster !== newNode?.cluster,
                ),
            ).toBe(true);
        }
    });

    it("spreads the phase-four signals across clusters and quadrants", () => {
        const nodes = new Map(
            LANDING_GRAPH_NODES.map((node) => [node.id, node] as const),
        );
        const signals = PHASE_FOUR_NODE_IDS.map((id) => nodes.get(id));

        expect(signals.every(Boolean)).toBe(true);
        // One per cluster and one per quadrant, so the loop grows the graph
        // somewhere different on every pass.
        expect(new Set(signals.map((node) => node?.cluster)).size).toBe(
            PHASE_FOUR_NODE_IDS.length,
        );
        expect(
            new Set(
                signals.map(
                    (node) => `${(node?.x ?? 0) < 50}:${(node?.y ?? 0) < 50}`,
                ),
            ).size,
        ).toBe(PHASE_FOUR_NODE_IDS.length);
    });
});
