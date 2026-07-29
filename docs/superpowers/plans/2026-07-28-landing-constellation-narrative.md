# Landing Constellation Narrative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four isolated `Cómo funciona` cards with one persistent GSAP constellation that transforms supported sources into an organic graph, reveals decision context, and integrates new context as a real node.

**Architecture:** Keep four pinned copy scenes, but mount one borderless `StageScreen` apparatus beside them. Put deterministic source and graph fixtures in a pure data module, render graph geometry through focused SVG components, and let one scoped GSAP controller move the persistent markup between phases without React state updates per frame. Keep one Paper `NeuroNoise` instance; mobile and reduced motion render the completed static graph.

**Tech Stack:** Next.js 16.2.6 · React 19.2.4 · TypeScript 5 · GSAP 3.15 · `@gsap/react` 2.1 · Paper Shaders React 0.0.77 · Tailwind CSS 4 · Vitest 3.2 · Biome 2.3

## Global Constraints

- Work directly on `main`; the user explicitly authorized direct-main implementation. Do not create a branch or worktree unless they reverse that decision.
- Implementation subagents use Spark only. Task-level review uses Sonnet or Haiku. Final whole-branch review uses GPT-5.4.
- Keep Lumen night layout, Instrument Serif, Geist, azure `--primary`, coral `--brand-chord`, shell width, and four-stage rail.
- Stage order is exactly `Conectar → Mapear → Decidir → Mantener`.
- Use one dynamically imported Paper `NeuroNoise` canvas. Do not mount another shader.
- Add no npm dependency, route, metric, unsupported provider logo, or fabricated product capability.
- Approved provider brands are Notion, Slack, Microsoft 365, and Documents. Microsoft 365 artifacts may show Teams, OneDrive, SharePoint, Word, Excel, and PowerPoint.
- Desktop motion starts at `64rem`. Mobile and `prefers-reduced-motion: reduce` do not pin or loop.
- Animate only `x`, `y`, `scale`, `rotation`, and `autoAlpha`; do not animate layout properties or update React state per frame.
- Keep the deterministic graph at exactly 32 nodes and between 44 and 56 edges.
- Keep source/artifact density between 12 and 16 visible marks.
- Keep production files under 500 lines by splitting data, source marks, graph rendering, and motion ownership.
- Every commit message ends with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- After each task: run its focused checks, inspect `git diff --check`, commit, then run a Sonnet/Haiku task-level review before starting the next task.

## File Map

### Create

- `src/frontend/components/landing/stage-screen-data.ts` — typed provider fixtures, deterministic graph nodes and generated edges, decision route, phase-four integration contract.
- `src/frontend/components/landing/stage-source-mark.tsx` — local source and artifact marks; no network-loaded logos.
- `src/frontend/components/landing/stage-screen-graph.tsx` — SVG graph renderer with stable cluster, route, and integration targets.
- `src/frontend/components/landing/__tests__/stage-screen-data.test.ts` — data integrity and approved-provider tests.
- `src/frontend/components/landing/__tests__/stage-screen-graph.test.ts` — graph rendering contract.
- `src/frontend/components/landing/__tests__/brand-shader.test.ts` — constellation shader preset contract.

### Modify

- `src/frontend/components/landing/stage-screens.tsx` — replace four cards with one persistent apparatus and scoped GSAP phase controller.
- `src/frontend/components/landing/stages.tsx` — revised copy, one persistent apparatus, section-visibility state, static mobile/reduced layout.
- `src/frontend/components/landing/brand-shader.tsx` — constellation preset, `activeStage`, wrapper phase motion.
- `src/frontend/components/landing/motion.tsx` — section active callbacks and tighter copy handoffs.
- `src/app/globals.css` — remove reduced-motion `100svh` gaps and add focused constellation layout rules only where utilities are insufficient.
- `src/frontend/components/landing/__tests__/stage-screens.test.ts` — persistent apparatus and GSAP-target contract.
- `src/frontend/components/landing/__tests__/landing-stages.test.ts` — revised copy, semantics, and one-apparatus contract.

### Delete

- None.

---

### Task 1: Define Source and Graph Data Contracts

**Files:**
- Create: `src/frontend/components/landing/stage-screen-data.ts`
- Create: `src/frontend/components/landing/__tests__/stage-screen-data.test.ts`

**Interfaces:**
- Consumes: no feature-local interface.
- Produces: `GraphCluster`, `LandingGraphNode`, `LandingGraphEdge`, `SourceVisual`, `GRAPH_CLUSTERS`, `LANDING_SOURCES`, `LANDING_GRAPH_NODES`, `LANDING_GRAPH_EDGES`, `DECISION_ROUTE_NODE_IDS`, `PHASE_FOUR_NODE_ID`.

- [ ] **Step 1: Write the failing data-contract test**

Create `src/frontend/components/landing/__tests__/stage-screen-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
    GRAPH_CLUSTERS,
    LANDING_GRAPH_EDGES,
    LANDING_GRAPH_NODES,
    LANDING_SOURCES,
    PHASE_FOUR_NODE_ID,
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
        expect(LANDING_SOURCES.some((source) => source.label.includes("Outlook"))).toBe(
            false,
        );
    });

    it("defines a stable four-cluster graph", () => {
        const ids = LANDING_GRAPH_NODES.map((node) => node.id);
        const clusters = new Set(LANDING_GRAPH_NODES.map((node) => node.cluster));

        expect(new Set(ids).size).toBe(ids.length);
        expect(LANDING_GRAPH_NODES).toHaveLength(32);
        expect(LANDING_GRAPH_EDGES.length).toBeGreaterThanOrEqual(44);
        expect(LANDING_GRAPH_EDGES.length).toBeLessThanOrEqual(56);
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

    it("integrates the phase-four node through hub and cross-cluster edges", () => {
        const nodes = new Map(
            LANDING_GRAPH_NODES.map((node) => [node.id, node] as const),
        );
        const newNode = nodes.get(PHASE_FOUR_NODE_ID);
        const edges = LANDING_GRAPH_EDGES.filter(
            (edge) => edge.introducedInPhase === 4,
        );
        const connected = edges.filter(
            (edge) =>
                edge.source === PHASE_FOUR_NODE_ID ||
                edge.target === PHASE_FOUR_NODE_ID,
        );

        expect(newNode?.introducedInPhase).toBe(4);
        expect(connected).toHaveLength(3);
        expect(
            connected.some((edge) => {
                const otherId =
                    edge.source === PHASE_FOUR_NODE_ID
                        ? edge.target
                        : edge.source;
                return nodes.get(otherId)?.hub === true;
            }),
        ).toBe(true);
        expect(
            connected.some((edge) => {
                const otherId =
                    edge.source === PHASE_FOUR_NODE_ID
                        ? edge.target
                        : edge.source;
                return nodes.get(otherId)?.cluster !== newNode?.cluster;
            }),
        ).toBe(true);
    });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm test -- src/frontend/components/landing/__tests__/stage-screen-data.test.ts
```

Expected: FAIL because `../stage-screen-data` does not exist.

- [ ] **Step 3: Implement exact types and source fixtures**

Create `src/frontend/components/landing/stage-screen-data.ts` with these exported types and 14 source records:

```ts
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

export type SourceMark =
    | "notion"
    | "slack"
    | "microsoft-365"
    | "documents"
    | "teams"
    | "onedrive"
    | "sharepoint"
    | "word"
    | "excel"
    | "powerpoint"
    | "pdf"
    | "note"
    | "decision-log"
    | "agreement";

export type SourceVisual = {
    id: string;
    label: string;
    kind: "provider" | "artifact";
    mark: SourceMark;
    cluster: GraphCluster;
    x: number;
    y: number;
    depth: number;
    rotation: number;
};

export const LANDING_SOURCES: readonly SourceVisual[] = [
    { id: "notion", label: "Notion", kind: "provider", mark: "notion", cluster: "document", x: 8, y: 24, depth: 1, rotation: -8 },
    { id: "slack", label: "Slack", kind: "provider", mark: "slack", cluster: "document", x: 12, y: 68, depth: 2, rotation: 6 },
    { id: "microsoft-365", label: "Microsoft 365", kind: "provider", mark: "microsoft-365", cluster: "document", x: 49, y: 4, depth: 3, rotation: -4 },
    { id: "documents", label: "Documentos", kind: "provider", mark: "documents", cluster: "document", x: 90, y: 20, depth: 1, rotation: 7 },
    { id: "teams-thread", label: "Conversación de Teams", kind: "artifact", mark: "teams", cluster: "document", x: 94, y: 61, depth: 2, rotation: -6 },
    { id: "onedrive-file", label: "Archivo de OneDrive", kind: "artifact", mark: "onedrive", cluster: "document", x: 64, y: 92, depth: 3, rotation: 5 },
    { id: "sharepoint-page", label: "Página de SharePoint", kind: "artifact", mark: "sharepoint", cluster: "document", x: 18, y: 89, depth: 1, rotation: -5 },
    { id: "word-brief", label: "Brief de Word", kind: "artifact", mark: "word", cluster: "document", x: 2, y: 48, depth: 2, rotation: 8 },
    { id: "excel-model", label: "Modelo de Excel", kind: "artifact", mark: "excel", cluster: "criterion", x: 75, y: 8, depth: 1, rotation: -7 },
    { id: "powerpoint-deck", label: "Deck de PowerPoint", kind: "artifact", mark: "powerpoint", cluster: "decision", x: 84, y: 83, depth: 3, rotation: 4 },
    { id: "pdf-policy", label: "Política PDF", kind: "artifact", mark: "pdf", cluster: "criterion", x: 33, y: 10, depth: 2, rotation: 7 },
    { id: "meeting-note", label: "Nota de reunión", kind: "artifact", mark: "note", cluster: "person", x: 28, y: 78, depth: 1, rotation: -4 },
    { id: "decision-log", label: "Registro de decisión", kind: "artifact", mark: "decision-log", cluster: "decision", x: 69, y: 34, depth: 2, rotation: 5 },
    { id: "project-agreement", label: "Acuerdo de proyecto", kind: "artifact", mark: "agreement", cluster: "decision", x: 38, y: 94, depth: 3, rotation: -6 },
];
```

- [ ] **Step 4: Add the exact 32-node fixture**

Append this data. Coordinates use a stable `0..100` view box; the phase-four node is part of the document cluster from the start but renders hidden until integration.

```ts
export const PHASE_FOUR_NODE_ID = "document-new-signal";

export const DECISION_ROUTE_NODE_IDS = [
    "person-founder",
    "decision-launch",
    "document-strategy",
    "criterion-market",
] as const;

export const LANDING_GRAPH_NODES: readonly LandingGraphNode[] = [
    { id: "person-founder", cluster: "person", label: "Personas", radius: 14, x: 31, y: 29, hub: true, introducedInPhase: 2 },
    { id: "person-product", cluster: "person", radius: 8, x: 20, y: 18, introducedInPhase: 2 },
    { id: "person-engineering", cluster: "person", radius: 7, x: 40, y: 12, introducedInPhase: 2 },
    { id: "person-people", cluster: "person", radius: 6, x: 15, y: 35, introducedInPhase: 2 },
    { id: "person-sales", cluster: "person", radius: 8, x: 38, y: 38, introducedInPhase: 2 },
    { id: "person-ops", cluster: "person", radius: 5, x: 10, y: 22, introducedInPhase: 2 },
    { id: "person-design", cluster: "person", radius: 6, x: 28, y: 45, introducedInPhase: 2 },
    { id: "person-customer", cluster: "person", radius: 5, x: 46, y: 25, introducedInPhase: 2 },
    { id: "decision-launch", cluster: "decision", label: "Decisiones", radius: 15, x: 69, y: 28, hub: true, introducedInPhase: 2 },
    { id: "decision-pricing", cluster: "decision", radius: 7, x: 58, y: 13, introducedInPhase: 2 },
    { id: "decision-hiring", cluster: "decision", radius: 6, x: 78, y: 11, introducedInPhase: 2 },
    { id: "decision-roadmap", cluster: "decision", radius: 8, x: 88, y: 27, introducedInPhase: 2 },
    { id: "decision-policy", cluster: "decision", radius: 7, x: 73, y: 43, introducedInPhase: 2 },
    { id: "decision-budget", cluster: "decision", radius: 6, x: 56, y: 34, introducedInPhase: 2 },
    { id: "decision-market", cluster: "decision", radius: 5, x: 91, y: 43, introducedInPhase: 2 },
    { id: "decision-scope", cluster: "decision", radius: 5, x: 66, y: 21, introducedInPhase: 2 },
    { id: "document-strategy", cluster: "document", label: "Documentos", radius: 15, x: 70, y: 70, hub: true, introducedInPhase: 2 },
    { id: "document-prd", cluster: "document", radius: 8, x: 57, y: 61, introducedInPhase: 2 },
    { id: "document-policy", cluster: "document", radius: 7, x: 84, y: 57, introducedInPhase: 2 },
    { id: "document-research", cluster: "document", radius: 6, x: 91, y: 72, introducedInPhase: 2 },
    { id: "document-plan", cluster: "document", radius: 7, x: 75, y: 88, introducedInPhase: 2 },
    { id: "document-notes", cluster: "document", radius: 5, x: 58, y: 81, introducedInPhase: 2 },
    { id: "document-financial", cluster: "document", radius: 5, x: 89, y: 88, introducedInPhase: 2 },
    { id: PHASE_FOUR_NODE_ID, cluster: "document", radius: 6, x: 97, y: 79, introducedInPhase: 4 },
    { id: "criterion-market", cluster: "criterion", label: "Criterios", radius: 14, x: 31, y: 72, hub: true, introducedInPhase: 2 },
    { id: "criterion-customer", cluster: "criterion", radius: 7, x: 18, y: 60, introducedInPhase: 2 },
    { id: "criterion-risk", cluster: "criterion", radius: 6, x: 42, y: 58, introducedInPhase: 2 },
    { id: "criterion-quality", cluster: "criterion", radius: 8, x: 48, y: 74, introducedInPhase: 2 },
    { id: "criterion-speed", cluster: "criterion", radius: 7, x: 36, y: 90, introducedInPhase: 2 },
    { id: "criterion-cost", cluster: "criterion", radius: 6, x: 16, y: 84, introducedInPhase: 2 },
    { id: "criterion-culture", cluster: "criterion", radius: 5, x: 6, y: 70, introducedInPhase: 2 },
    { id: "criterion-compliance", cluster: "criterion", radius: 5, x: 26, y: 51, introducedInPhase: 2 },
];
```

- [ ] **Step 5: Generate 51 deterministic edges**

Append the following helpers. They create 44 intra-cluster edges, six ordinary cross-cluster edges, and one phase-four cross-cluster edge. Exactly three edges touch the new node and carry `introducedInPhase: 4`.

```ts
const NODE_IDS_BY_CLUSTER: Record<GraphCluster, readonly string[]> = {
    person: LANDING_GRAPH_NODES.filter((node) => node.cluster === "person").map((node) => node.id),
    decision: LANDING_GRAPH_NODES.filter((node) => node.cluster === "decision").map((node) => node.id),
    document: LANDING_GRAPH_NODES.filter((node) => node.cluster === "document").map((node) => node.id),
    criterion: LANDING_GRAPH_NODES.filter((node) => node.cluster === "criterion").map((node) => node.id),
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

    const spokes = peripheral.map((nodeId) => ({
        id: `${cluster}-hub-${nodeId}`,
        source: hub,
        target: nodeId,
        introducedInPhase: phaseForEdge(hub, nodeId),
    } satisfies LandingGraphEdge));

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
    { id: "route-person-decision", source: "person-founder", target: "decision-launch", decisionRoute: true, introducedInPhase: 2 },
    { id: "route-decision-document", source: "decision-launch", target: "document-strategy", decisionRoute: true, introducedInPhase: 2 },
    { id: "route-document-criterion", source: "document-strategy", target: "criterion-market", decisionRoute: true, introducedInPhase: 2 },
    { id: "route-criterion-person", source: "criterion-market", target: "person-founder", decisionRoute: true, introducedInPhase: 2 },
    { id: "cross-person-document", source: "person-product", target: "document-prd", introducedInPhase: 2 },
    { id: "cross-decision-criterion", source: "decision-budget", target: "criterion-cost", introducedInPhase: 2 },
    { id: "phase-four-document-criterion", source: PHASE_FOUR_NODE_ID, target: "criterion-quality", introducedInPhase: 4 },
];

export const LANDING_GRAPH_EDGES: readonly LandingGraphEdge[] = [
    ...INTRA_CLUSTER_EDGES,
    ...CROSS_CLUSTER_EDGES,
];
```

- [ ] **Step 6: Run focused data tests and verify GREEN**

Run:

```bash
pnpm test -- src/frontend/components/landing/__tests__/stage-screen-data.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 7: Check and commit**

```bash
git diff --check
git add src/frontend/components/landing/stage-screen-data.ts src/frontend/components/landing/__tests__/stage-screen-data.test.ts
git commit -m "feat: define landing constellation data" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Render the Organic Graph

**Files:**
- Create: `src/frontend/components/landing/stage-screen-graph.tsx`
- Create: `src/frontend/components/landing/__tests__/stage-screen-graph.test.ts`

**Interfaces:**
- Consumes: Task 1 exports `GRAPH_CLUSTERS`, `LANDING_GRAPH_NODES`, `LANDING_GRAPH_EDGES`, and `PHASE_FOUR_NODE_ID`.
- Produces: `StageScreenGraph(): ReactElement` with stable selectors `data-graph-camera`, `data-graph-cluster`, `data-graph-node`, `data-graph-edge`, `data-decision-route`, `data-phase-four-node`, and `data-phase-four-edge`.

- [ ] **Step 1: Write the failing graph-renderer test**

Create `src/frontend/components/landing/__tests__/stage-screen-graph.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StageScreenGraph } from "../stage-screen-graph";

function count(markup: string, attribute: string): number {
    return markup.match(new RegExp(attribute, "g"))?.length ?? 0;
}

describe("StageScreenGraph", () => {
    const markup = renderToStaticMarkup(createElement(StageScreenGraph));

    it("renders a dense four-cluster graph", () => {
        expect(markup).toContain("data-graph-camera");
        expect(count(markup, "data-graph-cluster=")).toBe(4);
        expect(count(markup, "data-graph-node=")).toBe(32);
        expect(count(markup, "data-graph-edge=")).toBe(51);
    });

    it("exposes decision and integration targets", () => {
        expect(count(markup, 'data-decision-route="true"')).toBe(4);
        expect(count(markup, 'data-phase-four-node="true"')).toBe(1);
        expect(count(markup, 'data-phase-four-edge="true"')).toBe(3);
    });

    it("labels only meaningful hubs", () => {
        for (const label of ["Personas", "Decisiones", "Documentos", "Criterios"]) {
            expect(markup).toContain(label);
        }
    });
});
```

- [ ] **Step 2: Run the renderer test and verify RED**

```bash
pnpm test -- src/frontend/components/landing/__tests__/stage-screen-graph.test.ts
```

Expected: FAIL because `../stage-screen-graph` does not exist.

- [ ] **Step 3: Implement a deterministic SVG renderer**

Create `src/frontend/components/landing/stage-screen-graph.tsx`. Render intra-cluster edges inside each cluster group and cross-cluster edges outside cluster groups. The group transform origin stays on its hub, allowing slight rotation without detaching the hub-to-hub cross edges.

```tsx
import type { ReactElement } from "react";
import {
    DECISION_ROUTE_NODE_IDS,
    GRAPH_CLUSTERS,
    LANDING_GRAPH_EDGES,
    LANDING_GRAPH_NODES,
    PHASE_FOUR_NODE_ID,
    type GraphCluster,
    type LandingGraphEdge,
    type LandingGraphNode,
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
            key={edge.id}
            data-graph-edge={edge.id}
            data-decision-route={edge.decisionRoute || undefined}
            data-phase-four-edge={
                edge.introducedInPhase === 4 ? true : undefined
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
                node.id === PHASE_FOUR_NODE_ID ? true : undefined
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
            aria-hidden
            data-graph-camera
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
```

- [ ] **Step 4: Run graph and data tests**

```bash
pnpm test -- src/frontend/components/landing/__tests__/stage-screen-data.test.ts src/frontend/components/landing/__tests__/stage-screen-graph.test.ts
```

Expected: 8 tests PASS.

- [ ] **Step 5: Check and commit**

```bash
git diff --check
git add src/frontend/components/landing/stage-screen-graph.tsx src/frontend/components/landing/__tests__/stage-screen-graph.test.ts
git commit -m "feat: render organic landing graph" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Build the Static Constellation Apparatus

**Files:**
- Create: `src/frontend/components/landing/stage-source-mark.tsx`
- Modify: `src/frontend/components/landing/stage-screens.tsx`
- Modify: `src/frontend/components/landing/__tests__/stage-screens.test.ts`

**Interfaces:**
- Consumes: `LANDING_SOURCES`, `SourceVisual`, and `StageScreenGraph`.
- Produces: `StageScreen({ activeStage, active })`, one persistent figure, source field, context paths, graph layer, decision focus, and integration signal.

- [ ] **Step 1: Replace old card tests with the failing persistent-apparatus contract**

Replace `src/frontend/components/landing/__tests__/stage-screens.test.ts` with:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StageScreen } from "../stage-screens";

function count(markup: string, attribute: string): number {
    return markup.match(new RegExp(attribute, "g"))?.length ?? 0;
}

describe("StageScreen", () => {
    const screen = renderToStaticMarkup(
        createElement(StageScreen, { activeStage: 0, active: true }),
    );

    it("renders one continuous constellation", () => {
        expect(screen).toContain("data-constellation-narrative");
        expect(screen).toContain('data-stage-active="true"');
        expect(screen).toMatch(/<figure[^>]*><figcaption/);
        expect(count(screen, "data-source-mark=")).toBe(14);
        expect(count(screen, "data-context-path=")).toBe(14);
        expect(count(screen, "data-context-packet=")).toBe(14);
        expect(screen).toContain("data-graph-camera");
    });

    it("exposes all four narrative layers", () => {
        for (const layer of ["sources", "graph", "decision", "integration"]) {
            expect(screen).toContain(`data-constellation-layer="${layer}"`);
        }
        expect(screen).toContain("data-decision-focus");
        expect(screen).toContain("data-integration-signal");
    });

    it("removes the old chat and freshness cards", () => {
        for (const oldContent of [
            "Head of Sales",
            "¿Puedo cerrar este deal",
            "Respuesta",
            "Grafo al día",
            "Actualizado",
        ]) {
            expect(screen).not.toContain(oldContent);
        }
    });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
pnpm test -- src/frontend/components/landing/__tests__/stage-screens.test.ts
```

Expected: FAIL because `StageScreen` still accepts `{ index, active }` and renders four cards.

- [ ] **Step 3: Implement local source marks**

Create `src/frontend/components/landing/stage-source-mark.tsx`. Use local shapes and existing Lucide icons; make the source label visible outside the icon so every artifact remains understandable.

```tsx
import {
    BadgeCheck,
    Cloud,
    FileText,
    Handshake,
    NotebookPen,
    PanelsTopLeft,
    Presentation,
    Sheet,
    Users,
} from "lucide-react";
import type { ReactElement } from "react";
import type {
    GraphCluster,
    SourceMark,
    SourceVisual,
} from "./stage-screen-data";

const CLUSTER_MARK_CLASSES: Record<GraphCluster, string> = {
    person: "bg-primary/15 text-primary",
    decision: "bg-brand-chord/15 text-brand-chord",
    document: "bg-secondary text-primary",
    criterion: "bg-secondary text-brand-chord",
};

function MicrosoftMark(): ReactElement {
    return (
        <svg viewBox="0 0 20 20" aria-hidden className="size-5">
            <path d="M1 1h8v8H1zM11 1h8v8h-8zM1 11h8v8H1zM11 11h8v8h-8z" fill="currentColor" />
        </svg>
    );
}

function SlackMark(): ReactElement {
    return (
        <svg viewBox="0 0 20 20" aria-hidden className="size-5">
            <path d="M8 1a2 2 0 0 1 2 2v5H8a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2Zm4 5h5a2 2 0 1 1 0 4h-5V6Zm0 6h2a2 2 0 0 1 2 2v3a2 2 0 1 1-4 0v-5Zm-9-2h5v4H3a2 2 0 1 1 0-4Z" fill="currentColor" />
        </svg>
    );
}

function Mark({ mark }: { mark: SourceMark }): ReactElement {
    switch (mark) {
        case "notion":
            return <span className="font-serif text-lg font-bold">N</span>;
        case "slack":
            return <SlackMark />;
        case "microsoft-365":
            return <MicrosoftMark />;
        case "teams":
            return <Users className="size-5" />;
        case "onedrive":
            return <Cloud className="size-5" />;
        case "sharepoint":
            return <PanelsTopLeft className="size-5" />;
        case "excel":
            return <Sheet className="size-5" />;
        case "powerpoint":
            return <Presentation className="size-5" />;
        case "note":
            return <NotebookPen className="size-5" />;
        case "decision-log":
            return <BadgeCheck className="size-5" />;
        case "agreement":
            return <Handshake className="size-5" />;
        case "documents":
        case "word":
        case "pdf":
            return <FileText className="size-5" />;
    }
}

export function StageSourceMark({ source }: { source: SourceVisual }): ReactElement {
    return (
        <div
            data-source-mark={source.id}
            data-source-depth={source.depth}
            data-source-cluster={source.cluster}
            className="absolute flex items-center gap-2 rounded-[var(--radius-card)] border border-border bg-card/85 px-3 py-2 text-foreground shadow-lg backdrop-blur-sm"
            style={{
                left: `${source.x}%`,
                top: `${source.y}%`,
                transform: `translate(-50%, -50%) rotate(${source.rotation}deg)`,
            }}
        >
            <span
                className={`grid size-8 place-items-center rounded-lg ${CLUSTER_MARK_CLASSES[source.cluster]}`}
            >
                <Mark mark={source.mark} />
            </span>
            <span className="max-w-24 text-[0.65rem] leading-tight">{source.label}</span>
        </div>
    );
}
```

- [ ] **Step 4: Replace four cards with one static persistent apparatus**

Rewrite `stage-screens.tsx` around this interface:

```ts
type StageIndex = 0 | 1 | 2 | 3;

type StageScreenProps = {
    activeStage: StageIndex;
    active: boolean;
};
```

Render one `<figure>` whose first child is `<figcaption>`. Use `LANDING_SOURCES` to render source marks and one curved SVG path per source. Keep every phase in the DOM so GSAP can transition without React remounts.

Use this exact path helper:

```ts
function contextPath(source: SourceVisual): string {
    const bend = source.depth * 2.5;
    const controlX = (source.x + 50) / 2 + (source.y < 50 ? bend : -bend);
    const controlY = (source.y + 50) / 2 + (source.x < 50 ? -bend : bend);
    return `M ${source.x} ${source.y} Q ${controlX} ${controlY} 50 50`;
}
```

Use this structure inside the figure:

```tsx
<figure
    ref={scope}
    data-constellation-narrative
    data-stage-active={active}
    data-active-stage={activeStage}
    className="relative min-h-[24rem] overflow-visible lg:absolute lg:inset-y-0 lg:right-0 lg:w-[62%]"
>
    <figcaption className="sr-only">
        Fuentes aportan contexto, forman un grafo, iluminan una decisión y reciben una señal nueva como nodo conectado.
    </figcaption>
    <div data-constellation-layer="sources" className="absolute inset-0">
        <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
            {LANDING_SOURCES.map((source) => (
                <g key={source.id}>
                    <path
                        data-context-path={source.id}
                        d={contextPath(source)}
                        className="fill-none stroke-primary/35"
                        vectorEffect="non-scaling-stroke"
                    />
                    <circle
                        data-context-packet={source.id}
                        data-packet-x={50 - source.x}
                        data-packet-y={50 - source.y}
                        cx={source.x}
                        cy={source.y}
                        r="0.65"
                        className={
                            source.cluster === "decision" ||
                            source.cluster === "criterion"
                                ? "fill-brand-chord"
                                : "fill-primary"
                        }
                    />
                </g>
            ))}
        </svg>
        {LANDING_SOURCES.map((source) => (
            <StageSourceMark key={source.id} source={source} />
        ))}
        <div data-continuum-core className="absolute left-1/2 top-1/2 grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary/50 bg-primary text-primary-foreground shadow-2xl">
            Continuum
        </div>
    </div>
    <div data-constellation-layer="graph" className="absolute inset-[8%]">
        <StageScreenGraph />
    </div>
    <div data-constellation-layer="decision" className="pointer-events-none absolute inset-0">
        <div data-decision-focus className="absolute left-[69%] top-[28%] grid size-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-brand-chord/60 text-center text-xs">
            <span>Decisión<br /><small className="text-muted-foreground">Contexto reunido</small></span>
        </div>
    </div>
    <div data-constellation-layer="integration" className="pointer-events-none absolute inset-0">
        <span data-integration-signal className="absolute right-0 bottom-[18%] rounded-full border border-primary/50 bg-card px-3 py-2 text-primary text-xs">
            Nuevo contexto
        </span>
        <span data-integration-wave className="absolute inset-[18%] rounded-full border border-primary/35" />
    </div>
</figure>
```

Keep this task static. Do not add timelines yet.

- [ ] **Step 5: Run apparatus, graph, and data tests**

```bash
pnpm test -- src/frontend/components/landing/__tests__/stage-screens.test.ts src/frontend/components/landing/__tests__/stage-screen-graph.test.ts src/frontend/components/landing/__tests__/stage-screen-data.test.ts
```

Expected: all focused tests PASS.

- [ ] **Step 6: Run format and type checks for touched files**

```bash
pnpm exec biome check src/frontend/components/landing/stage-screen-data.ts src/frontend/components/landing/stage-source-mark.tsx src/frontend/components/landing/stage-screen-graph.tsx src/frontend/components/landing/stage-screens.tsx src/frontend/components/landing/__tests__/stage-screen-data.test.ts src/frontend/components/landing/__tests__/stage-screen-graph.test.ts src/frontend/components/landing/__tests__/stage-screens.test.ts
pnpm typecheck
```

Expected: Biome PASS. If `typecheck` reaches the known Eden treaty ceiling, record its unchanged baseline and confirm no diagnostics point at touched landing files.

- [ ] **Step 7: Check and commit**

```bash
git diff --check
git add src/frontend/components/landing/stage-source-mark.tsx src/frontend/components/landing/stage-screens.tsx src/frontend/components/landing/__tests__/stage-screens.test.ts
git commit -m "feat: build landing constellation apparatus" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Revise Stage Copy and Mount One Persistent Apparatus

**Files:**
- Modify: `src/frontend/components/landing/stages.tsx`
- Modify: `src/frontend/components/landing/motion.tsx:238-361`
- Modify: `src/app/globals.css:227-246`
- Modify: `src/frontend/components/landing/__tests__/landing-stages.test.ts`

**Interfaces:**
- Consumes: `StageScreen({ activeStage, active })` from Task 3.
- Produces: revised `STAGES`, one persistent visual apparatus, normal-flow mobile copy, and `GsapPinnedScenes({ onSectionActiveChange })` lifecycle wiring.

- [ ] **Step 1: Write the failing landing-stage contract**

Replace old copy assertions in `landing-stages.test.ts` and add one-apparatus assertions:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingStages } from "../stages";

const STAGE_COPY = [
    ["Conectar", "Día uno", "Conecta lo que tu equipo ya sabe", "Sin migración", "Contexto desde el origen"],
    ["Mapear", "En segundo plano", "El contexto encuentra sus relaciones", "Grafo automático", "Relaciones vivas"],
    ["Decidir", "Antes de actuar", "Cada decisión llega con su contexto", "Contexto compartido", "Criterios conectados"],
    ["Mantener", "Continuo", "Cada señal hace evolucionar el grafo", "Sync continuo", "Topología viva"],
] as const;

describe("LandingStages", () => {
    const screen = renderToStaticMarkup(createElement(LandingStages));

    it("keeps four revised stages available to assistive technology", () => {
        expect(screen).toContain("Cómo funciona");
        expect(screen).toContain('aria-label="Todas las etapas"');
        expect(screen.match(/<h2(?:\s|>)/g)).toHaveLength(1);
        expect(screen.match(/<h3(?:\s|>)/g)).toHaveLength(8);

        const accessibleScenes = screen.slice(
            screen.indexOf('aria-label="Todas las etapas"'),
        );
        for (const stage of STAGE_COPY) {
            for (const content of stage) expect(accessibleScenes).toContain(content);
        }
    });

    it("mounts one persistent apparatus instead of four cards", () => {
        expect(screen.match(/data-constellation-narrative/g)).toHaveLength(1);
        expect(screen.match(/data-full-scene/g)).toHaveLength(4);
        expect(screen).toContain('data-stage-active="false"');
        expect(screen).not.toContain("Consultar");
        expect(screen).not.toContain("Head of Sales");
    });

    it("describes the complete transformation accessibly", () => {
        for (const summary of [
            "Notion, Slack, Microsoft 365 y documentos aportan decisiones, conversaciones, personas y criterios a Continuum.",
            "Continuum organiza ese contexto en un grafo de personas, decisiones, documentos y criterios relacionados.",
            "Una decisión conecta su contexto relevante: precedentes, personas, documentos y criterios.",
            "Una señal nueva se integra como nodo, crea relaciones y modifica el grafo.",
        ]) {
            expect(screen).toContain(summary);
        }
    });
});
```

- [ ] **Step 2: Run the landing test and verify RED**

```bash
pnpm test -- src/frontend/components/landing/__tests__/landing-stages.test.ts
```

Expected: FAIL on old `Consultar` copy and four `StageScreen` calls.

- [ ] **Step 3: Replace `STAGES` with the approved copy**

In `stages.tsx`, keep the existing `Stage` type and replace all four records with the exact messages from the spec. Use these exact summaries:

```ts
const ACCESSIBILITY_SUMMARIES = [
    "Notion, Slack, Microsoft 365 y documentos aportan decisiones, conversaciones, personas y criterios a Continuum.",
    "Continuum organiza ese contexto en un grafo de personas, decisiones, documentos y criterios relacionados.",
    "Una decisión conecta su contexto relevante: precedentes, personas, documentos y criterios.",
    "Una señal nueva se integra como nodo, crea relaciones y modifica el grafo.",
] as const;
```

Use the exact title/body/chip strings asserted in Step 1. Preserve strong emphasis only around the key phrase in each body; do not introduce a new claim.

- [ ] **Step 4: Add section lifecycle and move `StageScreen` outside the stage loop**

First extend `GsapPinnedScenesProps` in `motion.tsx`:

```ts
type GsapPinnedScenesProps = PropsWithChildren<{
    className?: string;
    onSceneChange: (index: number) => void;
    onSectionActiveChange?: (active: boolean) => void;
}>;
```

Mirror the existing `onSceneChangeRef` pattern for `onSectionActiveChange`. Add these callbacks to the existing pinned `scrollTrigger`:

```ts
onEnter: () => onSectionActiveChangeRef.current?.(true),
onEnterBack: () => onSectionActiveChangeRef.current?.(true),
onLeave: () => onSectionActiveChangeRef.current?.(false),
onLeaveBack: () => onSectionActiveChangeRef.current?.(false),
```

In the non-desktop or reduced-motion branch, call
`onSectionActiveChangeRef.current?.(false)` before returning. This makes Task 4
type-safe and gives Task 5 real visibility state from its first animation.

Add section-active state in `LandingStages`:

```ts
const [activeScene, setActiveScene] = useState(0);
const [sectionActive, setSectionActive] = useState(false);
```

Pass `onSectionActiveChange={setSectionActive}` to `GsapPinnedScenes`. Inside the `aria-hidden` shell, render one `StageScreen` before the copy `<ol>`:

```tsx
<StageScreen
    activeStage={activeScene as 0 | 1 | 2 | 3}
    active={sectionActive}
/>
```

Each `data-full-scene` list item now renders only the left copy. Give desktop list items a bounded left column and vertical centering:

```tsx
className="full-scene-panel grid min-w-0 content-center gap-[var(--space-xl)] py-[var(--space-xl)] lg:absolute lg:inset-0 lg:w-[42%] lg:py-[var(--space-2xl)]"
```

Keep the progress rail unchanged except for any class shift needed to avoid overlapping the apparatus.

- [ ] **Step 5: Remove reduced-motion viewport gaps**

Change the reduced-motion desktop rule in `globals.css` from `min-height: 100svh` to normal-flow spacing:

```css
@media (min-width: 64rem) and (prefers-reduced-motion: reduce) {
    .full-scene-panel {
        position: relative;
        inset: auto;
        min-height: auto;
        padding-block: var(--space-xl);
    }
    .full-scene-progress {
        display: none;
    }
}
```

Do not add global graph colors or animation keyframes; those remain component-local GSAP concerns.

- [ ] **Step 6: Run focused tests and format check**

```bash
pnpm test -- src/frontend/components/landing/__tests__/landing-stages.test.ts src/frontend/components/landing/__tests__/stage-screens.test.ts src/frontend/components/landing/__tests__/scene-progress.test.ts
pnpm exec biome check src/frontend/components/landing/stages.tsx src/frontend/components/landing/motion.tsx src/frontend/components/landing/__tests__/landing-stages.test.ts src/app/globals.css
```

Expected: focused tests and Biome PASS.

- [ ] **Step 7: Check and commit**

```bash
git diff --check
git add src/frontend/components/landing/stages.tsx src/frontend/components/landing/motion.tsx src/app/globals.css src/frontend/components/landing/__tests__/landing-stages.test.ts
git commit -m "feat: mount persistent landing narrative" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Add Scoped GSAP Phase Choreography

**Files:**
- Modify: `src/frontend/components/landing/stage-screens.tsx`
- Modify: `src/frontend/components/landing/stage-screen-graph.tsx`
- Modify: `src/frontend/components/landing/__tests__/stage-screens.test.ts`

**Interfaces:**
- Consumes: persistent apparatus selectors and `activeStage` from Tasks 3–4.
- Produces: `useConstellationMotion`, phase transitions, phase-specific ambient loops, and final-state reduced/mobile rendering.

- [ ] **Step 1: Extend the failing motion-target contract**

Add these assertions to `stage-screens.test.ts`:

```ts
it("exposes complete GSAP choreography targets", () => {
    expect(count(screen, "data-graph-cluster=")).toBe(4);
    expect(count(screen, 'data-decision-route="true"')).toBe(4);
    expect(count(screen, 'data-phase-four-node="true"')).toBe(1);
    expect(count(screen, 'data-phase-four-edge="true"')).toBe(3);
    expect(screen).toContain("data-decision-particle");
    expect(screen).toContain("data-integration-wave");
    expect(screen).toContain("data-continuum-core");
});
```

Update `StageScreenGraph` if Task 2's attributes render empty/false values instead of the exact `"true"` contract.

- [ ] **Step 2: Run the focused test and verify RED if targets differ**

```bash
pnpm test -- src/frontend/components/landing/__tests__/stage-screens.test.ts
```

Expected: at least one new target assertion FAILS before target reconciliation.

- [ ] **Step 3: Define selector and phase state helpers**

Add these definitions near the top of `stage-screens.tsx`:

```ts
const layer = (name: string) => `[data-constellation-layer="${name}"]`;
const target = (name: string) => `[data-${name}]`;

type StageIndex = 0 | 1 | 2 | 3;

type LayerState = {
    autoAlpha: number;
    scale: number;
};

type PhaseState = {
    sources: LayerState;
    graph: LayerState;
    decision: LayerState;
    integration: LayerState;
    routeAlpha: number;
    graphAlpha: number;
};

const PHASE_STATES: Record<StageIndex, PhaseState> = {
    0: {
        sources: { autoAlpha: 1, scale: 1 },
        graph: { autoAlpha: 0, scale: 0.62 },
        decision: { autoAlpha: 0, scale: 0.72 },
        integration: { autoAlpha: 0, scale: 0.8 },
        routeAlpha: 0,
        graphAlpha: 0,
    },
    1: {
        sources: { autoAlpha: 0, scale: 0.28 },
        graph: { autoAlpha: 1, scale: 1 },
        decision: { autoAlpha: 0, scale: 0.72 },
        integration: { autoAlpha: 0, scale: 0.8 },
        routeAlpha: 0,
        graphAlpha: 0.68,
    },
    2: {
        sources: { autoAlpha: 0, scale: 0.2 },
        graph: { autoAlpha: 1, scale: 1.02 },
        decision: { autoAlpha: 1, scale: 1 },
        integration: { autoAlpha: 0, scale: 0.8 },
        routeAlpha: 1,
        graphAlpha: 0.24,
    },
    3: {
        sources: { autoAlpha: 0, scale: 0.2 },
        graph: { autoAlpha: 1, scale: 1 },
        decision: { autoAlpha: 0.55, scale: 0.96 },
        integration: { autoAlpha: 1, scale: 1 },
        routeAlpha: 0.55,
        graphAlpha: 0.58,
    },
};
```

- [ ] **Step 4: Implement phase transitions from current state**

Add a function that never resets the full apparatus before transition:

```ts
function buildPhaseTransition(stage: StageIndex): gsap.core.Timeline {
    const state = PHASE_STATES[stage];
    return gsap
        .timeline({ defaults: { duration: 0.62, ease: "power2.inOut", overwrite: "auto" } })
        .to(layer("sources"), state.sources, 0)
        .to(layer("graph"), state.graph, 0)
        .to(layer("decision"), state.decision, 0)
        .to(layer("integration"), state.integration, 0)
        .to('[data-decision-route="true"]', { autoAlpha: state.routeAlpha }, 0)
        .to(
            '[data-graph-edge]:not([data-decision-route="true"]):not([data-phase-four-edge="true"])',
            { autoAlpha: state.graphAlpha },
            0,
        )
        .to('[data-phase-four-node="true"]', { autoAlpha: 0, scale: 0.35 }, 0)
        .to('[data-phase-four-edge="true"]', { autoAlpha: 0 }, 0);
}
```

- [ ] **Step 5: Implement one ambient timeline per phase**

Use one factory and kill the old loop before creating the new one. Import
`DECISION_ROUTE_NODE_IDS` and `LANDING_GRAPH_NODES` from
`./stage-screen-data` so the route particle follows real graph coordinates:

```ts
function buildAmbientTimeline(stage: StageIndex): gsap.core.Timeline {
    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });

    if (stage === 0) {
        const packets = gsap.utils.toArray<SVGCircleElement>(
            "[data-context-packet]",
        );
        packets.forEach((packet, index) => {
            const x = Number(packet.dataset.packetX);
            const y = Number(packet.dataset.packetY);
            const at = index * 0.08;
            timeline
                .set(packet, { x: 0, y: 0, autoAlpha: 0 }, at)
                .to(packet, { autoAlpha: 1, duration: 0.12 }, at)
                .to(packet, { x, y, duration: 1.05, ease: "power1.in" }, at)
                .to(packet, { autoAlpha: 0, duration: 0.12 }, at + 0.93);
        });
        return timeline
            .to(
                "[data-source-mark]",
                {
                    y: (index) => (index % 2 === 0 ? -8 : 6),
                    rotation: (index) => (index % 2 === 0 ? 2 : -2),
                    duration: 1.8,
                    stagger: 0.06,
                    ease: "sine.inOut",
                },
                0,
            )
            .to("[data-source-mark]", {
                y: 0,
                rotation: 0,
                duration: 1.8,
                stagger: 0.04,
                ease: "sine.inOut",
            })
            .to({}, { duration: 0.8 });
    }

    if (stage === 1) {
        return timeline
            .to("[data-graph-camera]", {
                rotation: 3,
                scale: 1.02,
                transformOrigin: "center center",
                duration: 3.2,
                ease: "sine.inOut",
            })
            .to("[data-graph-camera]", {
                rotation: -2,
                scale: 0.99,
                duration: 3.2,
                ease: "sine.inOut",
            })
            .to(
                "[data-graph-cluster]",
                {
                    rotation: (index) => (index % 2 === 0 ? 1.8 : -1.5),
                    duration: 2.8,
                    stagger: 0.12,
                    yoyo: true,
                    repeat: 1,
                    ease: "sine.inOut",
                },
                0,
            );
    }

    if (stage === 2) {
        const routeNodes = DECISION_ROUTE_NODE_IDS.map((id) => {
            const node = LANDING_GRAPH_NODES.find((candidate) => candidate.id === id);
            if (!node) throw new Error(`Missing route node ${id}`);
            return node;
        });
        const origin = routeNodes[0];
        const particle = target("decision-particle");
        timeline.set(particle, { x: 0, y: 0, autoAlpha: 0 });
        timeline.to(particle, { autoAlpha: 1, duration: 0.18 });
        for (const node of routeNodes.slice(1)) {
            timeline.to(particle, {
                x: node.x - origin.x,
                y: node.y - origin.y,
                duration: 0.42,
                ease: "power1.inOut",
            });
        }
        return timeline
            .to(target("decision-focus"), { scale: 1.04, duration: 0.24 })
            .to(target("decision-focus"), { scale: 1, duration: 0.28 })
            .to(particle, { autoAlpha: 0, duration: 0.18 })
            .to({}, { duration: 1.1 });
    }

    return timeline
        .set(target("integration-signal"), { x: 40, y: 26, scale: 0.8, autoAlpha: 0 })
        .set('[data-phase-four-node="true"]', { scale: 0.35, autoAlpha: 0 })
        .set('[data-phase-four-edge="true"]', { autoAlpha: 0 })
        .to(target("integration-signal"), { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 0.32 })
        .to(target("integration-signal"), { x: -128, y: -76, scale: 0.3, autoAlpha: 0, duration: 0.72, ease: "power2.in" })
        .to('[data-phase-four-node="true"]', { scale: 1, autoAlpha: 1, duration: 0.3 }, ">-0.12")
        .to('[data-phase-four-edge="true"]', { autoAlpha: 1, duration: 0.32, stagger: 0.08 }, ">-0.1")
        .fromTo(target("integration-wave"), { scale: 0.4, autoAlpha: 0.8 }, { scale: 1.45, autoAlpha: 0, duration: 0.75 })
        .to("[data-graph-camera]", { scale: 1.025, duration: 0.24, yoyo: true, repeat: 1 }, "<")
        .to({}, { duration: 1.2 })
        .to(['[data-phase-four-node="true"]', '[data-phase-four-edge="true"]'], { autoAlpha: 0, duration: 0.15 });
}
```

- [ ] **Step 6: Wire timelines through scoped `useGSAP`**

Keep timeline refs in `StageScreen` and use dependency updates without reverting inline state between stages:

```ts
const transition = useRef<gsap.core.Timeline | null>(null);
const ambient = useRef<gsap.core.Timeline | null>(null);

useGSAP(
    () => {
        transition.current?.kill();
        ambient.current?.kill();

        const desktop = window.matchMedia("(min-width: 64rem)").matches;
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        if (!desktop || reduceMotion) {
            gsap.set(layer("sources"), { autoAlpha: 0.5, scale: 0.72 });
            gsap.set(layer("graph"), { autoAlpha: 1, scale: 1 });
            gsap.set(layer("decision"), { autoAlpha: 1, scale: 1 });
            gsap.set(layer("integration"), { autoAlpha: 1, scale: 1 });
            gsap.set('[data-phase-four-node="true"], [data-phase-four-edge="true"]', {
                autoAlpha: 1,
                scale: 1,
            });
            return;
        }

        if (!active) return;

        transition.current = buildPhaseTransition(activeStage);
        transition.current.eventCallback("onComplete", () => {
            ambient.current = buildAmbientTimeline(activeStage);
        });
    },
    {
        scope,
        dependencies: [activeStage, active],
        revertOnUpdate: false,
    },
);
```

The outer `useGSAP` context reverts on unmount. Import `useEffect` and add explicit document-visibility and teardown effects:

```ts
useEffect(() => {
    const syncVisibility = () => {
        const paused = document.hidden || !active;
        transition.current?.paused(paused);
        ambient.current?.paused(paused);
    };

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () =>
        document.removeEventListener("visibilitychange", syncVisibility);
}, [active]);

useEffect(
    () => () => {
        transition.current?.kill();
        ambient.current?.kill();
    },
    [],
);
```

Do not call `media.revert()` on every stage change because it would snap the apparatus back to initial styles.

- [ ] **Step 7: Run focused tests and type checks**

```bash
pnpm test -- src/frontend/components/landing/__tests__/stage-screens.test.ts src/frontend/components/landing/__tests__/stage-screen-graph.test.ts src/frontend/components/landing/__tests__/landing-stages.test.ts
pnpm exec biome check src/frontend/components/landing/stage-screens.tsx src/frontend/components/landing/stage-screen-graph.tsx src/frontend/components/landing/__tests__/stage-screens.test.ts
pnpm typecheck
```

Expected: focused tests and Biome PASS. For the known Eden blocker, use the Task 3 baseline rule.

- [ ] **Step 8: Check and commit**

```bash
git diff --check
git add src/frontend/components/landing/stage-screens.tsx src/frontend/components/landing/stage-screen-graph.tsx src/frontend/components/landing/__tests__/stage-screens.test.ts
git commit -m "feat: animate constellation narrative" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Add Shader Phase Motion and Tighten Pinned Handoffs

**Files:**
- Create: `src/frontend/components/landing/__tests__/brand-shader.test.ts`
- Modify: `src/frontend/components/landing/brand-shader.tsx`
- Modify: `src/frontend/components/landing/motion.tsx:238-361`
- Modify: `src/frontend/components/landing/stages.tsx`
- Modify: `src/frontend/components/landing/__tests__/landing-stages.test.ts`

**Interfaces:**
- Consumes: `activeStage`, `sectionActive`, and `GsapPinnedScenes({ onSectionActiveChange })` from Task 4.
- Produces: `BRAND_SHADER_PRESETS.constellation`, `BrandShader({ activeStage })`, and tighter pinned copy handoffs.

- [ ] **Step 1: Write the failing shader preset test**

Create `src/frontend/components/landing/__tests__/brand-shader.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BRAND_SHADER_PRESETS } from "../brand-shader";

describe("BrandShader constellation preset", () => {
    it("uses one stronger but slow NeuroNoise treatment", () => {
        expect(BRAND_SHADER_PRESETS.constellation).toEqual({
            scale: 1.24,
            rotation: 0.72,
            speed: 0.16,
            opacity: "opacity-[0.28]",
        });
    });
});
```

- [ ] **Step 2: Run shader test and verify RED**

```bash
pnpm test -- src/frontend/components/landing/__tests__/brand-shader.test.ts
```

Expected: FAIL because `BRAND_SHADER_PRESETS` and `constellation` are not exported.

- [ ] **Step 3: Add the constellation preset and wrapper phase states**

In `brand-shader.tsx`:

```ts
type Variant = "field" | "panel" | "band" | "constellation";

export const BRAND_SHADER_PRESETS: Record<
    Variant,
    { scale: number; rotation: number; speed: number; opacity: string }
> = {
    field: { scale: 1.1, rotation: 0.4, speed: 0.12, opacity: "opacity-[0.16]" },
    panel: { scale: 0.8, rotation: 1.2, speed: 0.18, opacity: "opacity-[0.2]" },
    band: { scale: 1.5, rotation: 2.1, speed: 0.1, opacity: "opacity-[0.13]" },
    constellation: { scale: 1.24, rotation: 0.72, speed: 0.16, opacity: "opacity-[0.28]" },
};

const SHADER_PHASES = [
    { autoAlpha: 0.78, scale: 1 },
    { autoAlpha: 0.92, scale: 1.025 },
    { autoAlpha: 1, scale: 1.045 },
    { autoAlpha: 0.88, scale: 1.02 },
] as const;
```

Add `activeStage = 0` to `BrandShader` props, attach a wrapper ref, and use scoped `useGSAP` to tween only that wrapper when `variant === "constellation"`, desktop motion is available, and reduced motion is false:

```ts
const scope = useRef<HTMLDivElement>(null);

useGSAP(
    () => {
        if (variant !== "constellation" || reduce || !desktopMotion) return;
        gsap.to(scope.current, {
            ...SHADER_PHASES[activeStage],
            duration: 0.65,
            ease: "power2.inOut",
            overwrite: "auto",
        });
    },
    { scope, dependencies: [activeStage, desktopMotion, reduce, variant] },
);
```

Keep `NeuroNoise` dynamically imported with `ssr: false`, and keep one canvas.

- [ ] **Step 4: Tighten pinned copy handoffs**

In the existing `GsapPinnedScenes` timeline from Task 4, keep all four scene thresholds and lifecycle callbacks. Change only these motion values:

```ts
scrollTrigger: {
    trigger: element,
    start: "top top",
    end: () => `+=${window.innerHeight * scenes.length}`,
    pin: true,
    scrub: 0.5,
    invalidateOnRefresh: true,
    onEnter: () => onSectionActiveChangeRef.current?.(true),
    onEnterBack: () => onSectionActiveChangeRef.current?.(true),
    onLeave: () => onSectionActiveChangeRef.current?.(false),
    onLeaveBack: () => onSectionActiveChangeRef.current?.(false),
}
```

Use `duration: 0.35`, outgoing `yPercent: -3`, and incoming `yPercent: 3` for copy transitions. Keep pin travel at four viewport heights so stage intervals remain equal.

- [ ] **Step 5: Wire stage and shader props**

In `stages.tsx`:

```tsx
<GsapPinnedScenes
    onSceneChange={setActiveScene}
    onSectionActiveChange={setSectionActive}
    className="relative overflow-clip lg:min-h-svh"
>
    <BrandShader
        activeStage={activeScene}
        desktopMotionOnly
        variant="constellation"
    />
```

Remove `className="opacity-[0.2]"`; it would override preset opacity.

Add this assertion to `landing-stages.test.ts`:

```ts
expect(screen).not.toContain('opacity-[0.2]');
```

- [ ] **Step 6: Run focused tests and checks**

```bash
pnpm test -- src/frontend/components/landing/__tests__/brand-shader.test.ts src/frontend/components/landing/__tests__/landing-stages.test.ts src/frontend/components/landing/__tests__/stage-screens.test.ts src/frontend/components/landing/__tests__/scene-progress.test.ts
pnpm exec biome check src/frontend/components/landing/brand-shader.tsx src/frontend/components/landing/motion.tsx src/frontend/components/landing/stages.tsx src/frontend/components/landing/__tests__/brand-shader.test.ts src/frontend/components/landing/__tests__/landing-stages.test.ts
pnpm typecheck
```

Expected: focused tests and Biome PASS; apply the documented Eden baseline rule to typecheck.

- [ ] **Step 7: Check and commit**

```bash
git diff --check
git add src/frontend/components/landing/brand-shader.tsx src/frontend/components/landing/motion.tsx src/frontend/components/landing/stages.tsx src/frontend/components/landing/__tests__/brand-shader.test.ts src/frontend/components/landing/__tests__/landing-stages.test.ts
git commit -m "feat: synchronize shader and scene lifecycle" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Polish Responsive Layout and Verify the Complete Experience

**Files:**
- Modify: `src/frontend/components/landing/stage-screens.tsx`
- Modify: `src/frontend/components/landing/stage-source-mark.tsx`
- Modify: `src/frontend/components/landing/stage-screen-graph.tsx`
- Modify: `src/frontend/components/landing/stages.tsx`
- Modify: `src/app/globals.css`
- Test: all landing tests and project checks.

**Interfaces:**
- Consumes: complete feature from Tasks 1–6.
- Produces: verified desktop pinned motion, static mobile/reduced composition, no empty handoff, no hidden loops, and final review-ready code.

- [ ] **Step 1: Run all landing tests before visual work**

```bash
pnpm test -- src/frontend/components/landing/__tests__
```

Expected: all landing tests PASS.

- [ ] **Step 2: Start the app using the project run workflow**

Invoke `/run`, then open the landing page. Use browser widths `1440 × 900` and `1280 × 720`.

Verify in order:

1. section heading hands directly into a visible constellation;
2. phase one contains 14 irregular source/artifact marks, not rows or a perfect ring;
3. paths and packets make tools visibly feed Continuum;
4. phase two transforms the same visual mass into a 32-node organic graph;
5. hubs, peripheral nodes, and cross-cluster edges are readable;
6. camera/cluster movement is restrained and edges remain visually attached;
7. phase three has no chat card and clearly lights the four-cluster decision route;
8. phase four signal becomes the hidden graph node, reveals exactly three attached edges, moves with the graph, and remains integrated during the final hold;
9. reverse scrolling restores earlier phases without a flash;
10. progress rail does not overlap the apparatus.

- [ ] **Step 3: Verify mobile and reduced motion**

Review `320 × 800`, `375 × 812`, `414 × 896`, and `768 × 1024`:

- no pin;
- no internal loop;
- no horizontal scroll;
- no repeated visual apparatus;
- one completed composite contains sources, graph, decision route, phase-four node, and its three edges;
- four copy stages remain in normal flow and semantic order.

Emulate `prefers-reduced-motion: reduce` at `1440 × 900` and verify the same completed state appears with no spatial motion or `100svh` gaps.

- [ ] **Step 4: Verify lifecycle and rendering cost**

In browser evaluation, run:

```js
({
    canvasCount: document.querySelectorAll("canvas").length,
    apparatusCount: document.querySelectorAll("[data-constellation-narrative]").length,
    nodeCount: document.querySelectorAll("[data-graph-node]").length,
    edgeCount: document.querySelectorAll("[data-graph-edge]").length,
    horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
})
```

Expected:

```js
{
    canvasCount: 1,
    apparatusCount: 1,
    nodeCount: 32,
    edgeCount: 51,
    horizontalOverflow: false,
}
```

Scroll past the pinned section and confirm source/graph transforms stop changing after `onLeave` sets `active=false`. Switch browser tab away and confirm the Task 5 `visibilitychange` listener pauses both timeline refs while `document.hidden`; switch back and confirm only the active section can resume.

- [ ] **Step 5: Apply only evidence-driven polish**

Use these limits while fixing observed issues:

- source mark labels may hide below `48rem`, but marks remain visible;
- apparatus may bleed right, never across left copy;
- graph camera rotation stays within `-3deg..3deg`;
- graph camera scale stays within `0.98..1.03`;
- provider/source opacity never drops below `0.72` during phase one;
- shader wrapper opacity never exceeds the phase state `1` multiplied by preset class opacity;
- decision route uses `--brand-chord`; live context and phase-four integration use `--primary`;
- no new color token, shadow system, radius, font, dependency, or global keyframe.

- [ ] **Step 6: Run full verification**

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
git diff --check
git status --short
```

Expected:

- `pnpm check`: PASS;
- `pnpm test`: PASS with zero failed tests;
- `git diff --check`: no output;
- `git status --short`: only intentional landing changes before commit;
- `pnpm typecheck` and `pnpm build`: PASS, or reproduce only the exact known Eden treaty baseline with no new landing diagnostic.

- [ ] **Step 7: Commit polish if files changed**

If visual verification required code changes:

```bash
git add src/frontend/components/landing/stage-screens.tsx src/frontend/components/landing/stage-source-mark.tsx src/frontend/components/landing/stage-screen-graph.tsx src/frontend/components/landing/stages.tsx src/app/globals.css
git commit -m "fix: polish landing constellation experience" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

If no code changed, do not create an empty commit.

- [ ] **Step 8: Run final review gates**

1. Task-level spec-compliance review with Sonnet: compare implementation against `docs/superpowers/specs/2026-07-28-landing-constellation-narrative-design.md` line by line.
2. Task-level code-quality review with Sonnet or Haiku: check GSAP cleanup, selector scoping, data integrity, file size, and duplicate logic.
3. Final whole-branch review with GPT-5.4.
4. Apply confirmed fixes only, rerun focused checks for each fix, then rerun the full verification command block from Step 6.

---

## Completion Evidence

Do not claim completion until the final response includes fresh evidence for:

- focused landing tests;
- `pnpm check`;
- `pnpm typecheck` result, including exact baseline if blocked;
- `pnpm test` total and failures;
- `pnpm build` result, including exact baseline if blocked;
- desktop visual review at both required sizes;
- mobile review at all four required widths;
- reduced-motion review;
- one canvas, one apparatus, 32 nodes, 51 edges, no horizontal overflow;
- section timelines paused after leaving viewport;
- final git status and commit list.
