# Knowledge Graph Constellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app, force-directed "constellation" view of an organization's live knowledge graph at `/[slug]/app/graph`, with type filters, search-to-focus, hover neighbor-highlight, person scoping, and a node detail panel.

**Architecture:** A server route renders a `"use client"` explorer that fetches one bounded graph slice from `GET /api/v1/knowledge/graph` via TanStack Query (zod-validated), maps it to a pure view-model, and drives a client-only `react-force-graph-2d` canvas. All filtering/highlight/search is computed client-side over the fetched slice by pure helpers in `graph-viz.ts` (the only unit-tested module).

**Tech Stack:** Next 16 (App Router, RSC), React 19, `react-force-graph-2d` (canvas + d3-force), `@tanstack/react-query`, zod, Tailwind v4 + shadcn UI, `motion`, `lucide-react`, vitest + happy-dom.

## Global Constraints

- Embedding vectors NEVER cross the wire — use domain wire schemas only (`graphSchema` from `@/core/knowledge/domain/schemas`).
- The graph API is org-scoped + auth'd already; the `[slug]/app` layout enforces auth + active org. Do NOT add auth logic in the page.
- `EMBEDDING_DIM`/DB schema is out of scope — read-only visualization, no migrations.
- `react-force-graph-2d` touches `window` at import → it MUST be loaded client-only (runtime `import()` inside a mounted `"use client"` component). Never static-import it in a file that can render during SSR.
- Node wire shape (`nodeSchema`) has NO document URL — only `id, personId, type, label, summary, sourceChunkId, origin, confidence, createdAt`. The detail panel must not reference a source URL.
- Person names do not exist yet (`personId` is an opaque column). Person scope options are distinct `personId`s from the loaded slice + an "all" option.
- Follow existing conventions: `"use client"` at top, `cn` from `@/frontend/lib/utils`, shadcn primitives from `@/frontend/components/ui/*`, Spanish UI copy (matches `knowledge-chat.tsx`, sidebar).
- Run `pnpm check` (biome) and `pnpm typecheck` before each commit; both must be clean.

---

### Task 1: Pure view-model helpers (`graph-viz.ts`) + tests

The testable core. No React, no canvas, no network — pure functions over the wire `Graph`.

**Files:**
- Create: `src/core/knowledge/client/viz/graph-viz.ts`
- Test: `src/core/knowledge/client/viz/__tests__/graph-viz.test.ts`

**Interfaces:**
- Consumes: `Graph`, `KnowledgeNode`, `NodeType` from `@/core/knowledge/domain/types`.
- Produces (every later task depends on these exact names/types):
  - types `VizNode`, `VizLink`, `VizGraph`
  - `NODE_TYPES: NodeType[]`, `NODE_TYPE_COLORS: Record<NodeType,string>`, `NODE_TYPE_LABELS: Record<NodeType,string>`
  - `toVizGraph(graph: Graph): VizGraph`
  - `computeDegree(nodes, links): Map<string, number>`
  - `nodeRadius(degree: number): number`
  - `neighborIds(links: VizLink[], nodeId: string): Set<string>`
  - `filterByTypes(graph: VizGraph, active: Set<NodeType>): VizGraph`
  - `filterByPerson(graph: VizGraph, personId: string | null): VizGraph`
  - `distinctPersonIds(nodes: VizNode[]): string[]`
  - `matchNodeByLabel(nodes: VizNode[], query: string): VizNode | null`

- [ ] **Step 1: Write the failing test**

Create `src/core/knowledge/client/viz/__tests__/graph-viz.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Graph } from "@/core/knowledge/domain/types";
import {
    computeDegree,
    distinctPersonIds,
    filterByPerson,
    filterByTypes,
    matchNodeByLabel,
    neighborIds,
    NODE_TYPE_COLORS,
    NODE_TYPES,
    nodeRadius,
    toVizGraph,
} from "../graph-viz";

function node(
    id: string,
    over: Partial<Graph["nodes"][number]> = {},
): Graph["nodes"][number] {
    return {
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
function edge(
    id: string,
    from: string,
    to: string,
): Graph["edges"][number] {
    return { id, fromNodeId: from, toNodeId: to, type: "relates_to", weight: 1 };
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
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm vitest run src/core/knowledge/client/viz`
Expected: FAIL — `Cannot find module '../graph-viz'`.

- [ ] **Step 3: Implement `graph-viz.ts`**

Create `src/core/knowledge/client/viz/graph-viz.ts`:

```ts
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
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `pnpm vitest run src/core/knowledge/client/viz`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Lint + typecheck, then commit**

Run: `pnpm check && pnpm typecheck`
Expected: clean.

```bash
git add src/core/knowledge/client/viz/graph-viz.ts src/core/knowledge/client/viz/__tests__/graph-viz.test.ts
git commit -m "feat(knowledge): pure view-model helpers for graph constellation"
```

---

### Task 2: Data hook + route + sidebar entry + explorer skeleton

Wire a navigable `/graph` page that fetches the live slice and shows loading/empty/error, with a placeholder where the canvas will mount. No canvas yet.

**Files:**
- Create: `src/core/knowledge/client/viz/use-graph-query.ts`
- Create: `src/core/knowledge/client/ui/knowledge-graph-explorer.tsx`
- Create: `src/app/[slug]/app/graph/page.tsx`
- Modify: `src/app/[slug]/app/app-sidebar.tsx` (add NAV entry)

**Interfaces:**
- Consumes: `toVizGraph`, `VizGraph` (Task 1); `graphSchema` from `@/core/knowledge/domain/schemas`.
- Produces:
  - `useGraphQuery(personId?: string | null): { data?: VizGraph; isLoading: boolean; isError: boolean }`
  - `KnowledgeGraphExplorer` (default-exportable client component, no props)

- [ ] **Step 1: Implement the data hook**

Create `src/core/knowledge/client/viz/use-graph-query.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { graphSchema } from "@/core/knowledge/domain/schemas";
import { toVizGraph, type VizGraph } from "./graph-viz";

const envelopeSchema = z.object({
    response: graphSchema,
    code: z.literal("OK"),
    status: z.literal(200),
});

async function fetchGraph(personId?: string | null): Promise<VizGraph> {
    const params = new URLSearchParams({ limit: "200" });
    if (personId) params.set("personId", personId);
    const res = await fetch(`/api/v1/knowledge/graph?${params.toString()}`, {
        headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`graph fetch failed: ${res.status}`);
    const json = await res.json();
    return toVizGraph(envelopeSchema.parse(json).response);
}

/**
 * Fetch one bounded slice of the org's knowledge graph as a view-model.
 * `personId` is passed to the server only to shrink the payload; further
 * client-side person filtering still happens in the explorer.
 */
export function useGraphQuery(personId?: string | null) {
    const query = useQuery({
        queryKey: ["knowledge-graph", personId ?? null],
        queryFn: () => fetchGraph(personId),
        // Global default has throwOnError:true; opt out so we render our own error UI.
        throwOnError: false,
    });
    return {
        data: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
    };
}
```

- [ ] **Step 2: Implement the explorer skeleton**

Create `src/core/knowledge/client/ui/knowledge-graph-explorer.tsx`:

```tsx
"use client";

import { Waypoints } from "lucide-react";
import { Spinner } from "@/frontend/components/ui/spinner";
import { useGraphQuery } from "../viz/use-graph-query";

/**
 * Full-canvas explorer for the org's knowledge graph. Owns fetch + interaction
 * state; renders the force constellation and its controls (added in later tasks).
 */
export function KnowledgeGraphExplorer() {
    const { data, isLoading, isError } = useGraphQuery(null);

    if (isLoading) {
        return (
            <div className="grid h-[calc(100svh-4rem)] place-items-center">
                <Spinner />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="grid h-[calc(100svh-4rem)] place-items-center text-muted-foreground text-sm">
                No se pudo cargar el grafo. Intenta de nuevo.
            </div>
        );
    }

    if (!data || data.nodes.length === 0) {
        return (
            <div className="flex h-[calc(100svh-4rem)] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Waypoints className="size-10" />
                <div>
                    <p className="font-medium text-foreground">
                        Aún no hay conocimiento en el grafo
                    </p>
                    <p className="text-sm">
                        Sincroniza una fuente para empezar a ver conexiones.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-[calc(100svh-4rem)] w-full overflow-hidden">
            {/* canvas + controls mount here in later tasks */}
            <div className="grid h-full place-items-center text-muted-foreground text-sm">
                {data.nodes.length} nodos · {data.links.length} conexiones
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Create the route**

Create `src/app/[slug]/app/graph/page.tsx`:

```tsx
import { KnowledgeGraphExplorer } from "@/core/knowledge/client/ui/knowledge-graph-explorer";

/**
 * `/[slug]/app/graph` — force-directed view of the org's knowledge graph.
 * Auth + active organization are enforced by the parent `[slug]/app` layout.
 */
export default function GraphPage() {
    return <KnowledgeGraphExplorer />;
}
```

- [ ] **Step 4: Add the sidebar entry**

In `src/app/[slug]/app/app-sidebar.tsx`, update the imports and `NAV`:

Change the lucide import line (currently `import { FolderKanban, LogOut, Sparkles } from "lucide-react";`) to add `Waypoints`:

```tsx
import { FolderKanban, LogOut, Sparkles, Waypoints } from "lucide-react";
```

Then add a third `NAV` entry after `knowledge`:

```tsx
const NAV: NavItem[] = [
    { title: "Proyectos", segment: "projects", icon: FolderKanban },
    { title: "Conocimiento", segment: "knowledge", icon: Sparkles },
    { title: "Grafo", segment: "graph", icon: Waypoints },
];
```

- [ ] **Step 5: Verify it builds and renders**

Run: `pnpm typecheck && pnpm check`
Expected: clean.

Run: `pnpm dev`, sign in, open an org, click **Grafo** in the sidebar.
Expected: the page shows a spinner then either the empty state or "N nodos · M conexiones". (If the org has no ingested knowledge, the empty state is correct.)

- [ ] **Step 6: Commit**

```bash
git add src/core/knowledge/client/viz/use-graph-query.ts src/core/knowledge/client/ui/knowledge-graph-explorer.tsx "src/app/[slug]/app/graph/page.tsx" "src/app/[slug]/app/app-sidebar.tsx"
git commit -m "feat(knowledge): /graph route, sidebar entry, live graph fetch hook"
```

---

### Task 3: The force canvas (`graph-canvas.tsx`) + install dependency

Render the constellation: colored glowing nodes sized by degree, weighted links with directional particles. Client-only load of `react-force-graph-2d`.

**Files:**
- Create: `src/core/knowledge/client/ui/graph-canvas.tsx`
- Modify: `src/core/knowledge/client/ui/knowledge-graph-explorer.tsx`
- Modify: `package.json` (dependency added by `pnpm add`)

**Interfaces:**
- Consumes: `VizGraph`, `VizNode`, `NODE_TYPE_COLORS`, `nodeRadius` (Task 1).
- Produces:
  - `type GraphApi = { focusNode: (id: string) => void }`
  - `type GraphCanvasProps = { graph: VizGraph; highlightIds: Set<string> | null; onHoverNode: (id: string | null) => void; onClickNode: (node: VizNode) => void; registerApi: (api: GraphApi | null) => void; }`
  - `GraphCanvas` component. `highlightIds === null` → everything full opacity; non-null → only those ids are bright, the rest dim.

- [ ] **Step 1: Install the dependency**

Run: `pnpm add react-force-graph-2d`
Expected: added to `dependencies`. (It bundles `force-graph` + `d3-force`; no `@types` needed — it ships types.)

Verify import type resolves:
Run: `pnpm typecheck`
Expected: clean (no usage yet).

- [ ] **Step 2: Implement `graph-canvas.tsx`**

Create `src/core/knowledge/client/ui/graph-canvas.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
    NODE_TYPE_COLORS,
    nodeRadius,
    type VizGraph,
    type VizNode,
} from "../viz/graph-viz";

export type GraphApi = { focusNode: (id: string) => void };

export type GraphCanvasProps = {
    graph: VizGraph;
    /** null = no dimming; otherwise ids NOT in the set are dimmed. */
    highlightIds: Set<string> | null;
    onHoverNode: (id: string | null) => void;
    onClickNode: (node: VizNode) => void;
    registerApi: (api: GraphApi | null) => void;
};

// biome-ignore lint/suspicious/noExplicitAny: force-graph's runtime node type carries mutated x/y.
type FgNode = any;
// biome-ignore lint/suspicious/noExplicitAny: dynamic default export from a client-only lib.
type FgComponent = any;

/** Force-graph mutates the arrays it receives; hand it a private clone. */
function cloneForSim(graph: VizGraph) {
    return {
        nodes: graph.nodes.map((n) => ({ ...n })),
        links: graph.links.map((l) => ({ ...l })),
    };
}

export function GraphCanvas({
    graph,
    highlightIds,
    onHoverNode,
    onClickNode,
    registerApi,
}: GraphCanvasProps) {
    const [ForceGraph2D, setForceGraph2D] = useState<FgComponent>(null);
    // biome-ignore lint/suspicious/noExplicitAny: ForceGraphMethods ref shape is internal.
    const fgRef = useRef<any>(null);
    const dataRef = useRef(cloneForSim(graph));
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    // Client-only load — never imported during SSR (touches window).
    useEffect(() => {
        let alive = true;
        import("react-force-graph-2d").then((m) => {
            if (alive) setForceGraph2D(() => m.default);
        });
        return () => {
            alive = false;
        };
    }, []);

    // Re-clone when the (filtered) graph identity changes.
    useEffect(() => {
        dataRef.current = cloneForSim(graph);
    }, [graph]);

    // Track container size for the canvas.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const r = entries[0]?.contentRect;
            if (r) setSize({ width: r.width, height: r.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Expose imperative focus to the explorer.
    useEffect(() => {
        registerApi({
            focusNode: (id: string) => {
                const n = dataRef.current.nodes.find(
                    (x: FgNode) => x.id === id,
                ) as FgNode | undefined;
                const fg = fgRef.current;
                if (n && fg && typeof n.x === "number") {
                    fg.centerAt(n.x, n.y, 600);
                    fg.zoom(3, 600);
                }
            },
        });
        return () => registerApi(null);
    }, [registerApi]);

    return (
        <div ref={containerRef} className="absolute inset-0">
            {ForceGraph2D && size.width > 0 ? (
                <ForceGraph2D
                    ref={fgRef}
                    graphData={dataRef.current}
                    width={size.width}
                    height={size.height}
                    backgroundColor="rgba(0,0,0,0)"
                    cooldownTicks={120}
                    nodeRelSize={1}
                    nodeVal={(n: FgNode) => nodeRadius(n.degree)}
                    linkColor={() => "rgba(148,163,184,0.25)"}
                    linkWidth={(l: FgNode) => Math.max(0.5, l.weight)}
                    linkDirectionalParticles={(l: FgNode) =>
                        l.weight > 1 ? 2 : 0
                    }
                    linkDirectionalParticleWidth={1.5}
                    onNodeHover={(n: FgNode | null) =>
                        onHoverNode(n ? n.id : null)
                    }
                    onNodeClick={(n: FgNode) => onClickNode(n as VizNode)}
                    nodeCanvasObject={(
                        n: FgNode,
                        ctx: CanvasRenderingContext2D,
                        scale: number,
                    ) => {
                        const dim =
                            highlightIds !== null && !highlightIds.has(n.id);
                        const r = nodeRadius(n.degree);
                        const color =
                            NODE_TYPE_COLORS[
                                n.type as keyof typeof NODE_TYPE_COLORS
                            ] ?? "#94a3b8";
                        ctx.globalAlpha = dim ? 0.12 : 1;
                        ctx.beginPath();
                        ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
                        ctx.fillStyle = color;
                        ctx.shadowColor = color;
                        ctx.shadowBlur = dim ? 0 : 12;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        // Labels only when zoomed in enough and not dimmed.
                        if (!dim && scale > 1.2) {
                            const fontSize = 11 / scale;
                            ctx.font = `${fontSize}px ui-sans-serif, system-ui`;
                            ctx.textAlign = "center";
                            ctx.textBaseline = "top";
                            ctx.fillStyle = "rgba(226,232,240,0.9)";
                            ctx.fillText(n.label, n.x, n.y + r + 1);
                        }
                        ctx.globalAlpha = 1;
                    }}
                />
            ) : null}
        </div>
    );
}
```

- [ ] **Step 3: Mount the canvas in the explorer**

In `src/core/knowledge/client/ui/knowledge-graph-explorer.tsx`, replace the final `return (...)` block (the `relative h-[...]` div and its placeholder child) with a version that renders the canvas. Add imports at the top and interaction state:

```tsx
"use client";

import { Waypoints } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Spinner } from "@/frontend/components/ui/spinner";
import type { VizNode } from "../viz/graph-viz";
import { useGraphQuery } from "../viz/use-graph-query";
import { GraphCanvas, type GraphApi } from "./graph-canvas";
```

Keep the loading/error/empty branches exactly as in Task 2. Replace the success `return`:

```tsx
    // success branch:
    const apiRef = useRef<GraphApi | null>(null);
    const registerApi = useCallback((api: GraphApi | null) => {
        apiRef.current = api;
    }, []);
    const [, setSelected] = useState<VizNode | null>(null);

    return (
        <div className="relative h-[calc(100svh-4rem)] w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,theme(colors.slate.900/0.4),transparent)]">
            <GraphCanvas
                graph={data}
                highlightIds={null}
                onHoverNode={() => {}}
                onClickNode={(n) => setSelected(n)}
                registerApi={registerApi}
            />
        </div>
    );
```

> Note for the implementer: React requires hooks to run unconditionally. Move `apiRef`, `registerApi`, and `setSelected` to the TOP of the component (above the `if (isLoading)` guards), not inside the success branch. The snippet shows them next to their use for clarity; place the `useRef`/`useCallback`/`useState` calls with the other top-level hooks and keep only the `return (...)` in the success branch.

- [ ] **Step 4: Verify the constellation renders**

Run: `pnpm typecheck && pnpm check`
Expected: clean.

Run: `pnpm dev`, open `/[slug]/app/graph` for an org that HAS ingested knowledge.
Expected: a dark canvas with colored glowing nodes and links that settle into a layout; scroll to zoom, drag to pan; labels appear when zoomed in; hub nodes (more edges) are larger.

> If the org has no data, seed one document first via the ingest route/service, or temporarily point at an org that does. Do not fake data in the component.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/core/knowledge/client/ui/graph-canvas.tsx src/core/knowledge/client/ui/knowledge-graph-explorer.tsx
git commit -m "feat(knowledge): force-directed constellation canvas over live graph"
```

---

### Task 4: Type filter legend (`graph-legend.tsx`)

Color legend that doubles as per-type on/off toggles.

**Files:**
- Create: `src/core/knowledge/client/ui/graph-legend.tsx`
- Modify: `src/core/knowledge/client/ui/knowledge-graph-explorer.tsx`

**Interfaces:**
- Consumes: `NODE_TYPES`, `NODE_TYPE_COLORS`, `NODE_TYPE_LABELS`, `filterByTypes` (Task 1).
- Produces: `GraphLegend` with props `{ active: Set<NodeType>; onToggle: (t: NodeType) => void }`.

- [ ] **Step 1: Implement the legend**

Create `src/core/knowledge/client/ui/graph-legend.tsx`:

```tsx
"use client";

import type { NodeType } from "@/core/knowledge/domain/types";
import { cn } from "@/frontend/lib/utils";
import {
    NODE_TYPE_COLORS,
    NODE_TYPE_LABELS,
    NODE_TYPES,
} from "../viz/graph-viz";

export function GraphLegend({
    active,
    onToggle,
}: {
    active: Set<NodeType>;
    onToggle: (type: NodeType) => void;
}) {
    return (
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5">
            {NODE_TYPES.map((type) => {
                const on = active.has(type);
                return (
                    <button
                        key={type}
                        type="button"
                        onClick={() => onToggle(type)}
                        className={cn(
                            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                            on
                                ? "border-border bg-background/70 text-foreground backdrop-blur"
                                : "border-transparent bg-background/30 text-muted-foreground opacity-60",
                        )}
                    >
                        <span
                            className="size-2.5 rounded-full"
                            style={{
                                backgroundColor: NODE_TYPE_COLORS[type],
                                opacity: on ? 1 : 0.4,
                            }}
                        />
                        {NODE_TYPE_LABELS[type]}
                    </button>
                );
            })}
        </div>
    );
}
```

- [ ] **Step 2: Wire filtering into the explorer**

In `knowledge-graph-explorer.tsx`:

Add imports:
```tsx
import { useMemo } from "react";
import type { NodeType } from "@/core/knowledge/domain/types";
import { filterByTypes, NODE_TYPES } from "../viz/graph-viz";
import { GraphLegend } from "./graph-legend";
```

Add top-level state (with the other hooks):
```tsx
    const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(
        () => new Set(NODE_TYPES),
    );
    const toggleType = useCallback((type: NodeType) => {
        setActiveTypes((prev) => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type);
            else next.add(type);
            // Never allow zero types (nothing to show); keep at least one.
            return next.size === 0 ? prev : next;
        });
    }, []);
```

Derive the filtered graph (top-level, before the success return — but AFTER the early guards is fine since `data` may be undefined; guard it):
```tsx
    const filtered = useMemo(
        () => (data ? filterByTypes(data, activeTypes) : null),
        [data, activeTypes],
    );
```

> Implementer note: `useMemo` must run unconditionally too. Compute `filtered` at the top with a `data ? ... : null` guard, then use `filtered` (non-null in the success branch because `data` is defined there).

In the success `return`, pass `filtered` to the canvas and add the legend:
```tsx
        <div className="relative h-[calc(100svh-4rem)] w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,theme(colors.slate.900/0.4),transparent)]">
            <GraphLegend active={activeTypes} onToggle={toggleType} />
            <GraphCanvas
                graph={filtered ?? data}
                highlightIds={null}
                onHoverNode={() => {}}
                onClickNode={(n) => setSelected(n)}
                registerApi={registerApi}
            />
        </div>
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm check` → clean.
Run: `pnpm dev`, open `/graph`. Click legend chips.
Expected: toggling a type removes those nodes (and now-dangling links) and the sim re-settles; clicking again restores them; you can't turn all four off.

- [ ] **Step 4: Commit**

```bash
git add src/core/knowledge/client/ui/graph-legend.tsx src/core/knowledge/client/ui/knowledge-graph-explorer.tsx
git commit -m "feat(knowledge): type filter legend for the graph"
```

---

### Task 5: Hover neighbor-highlight

Hovering a node brightens it + its direct neighbors + their links; everything else dims.

**Files:**
- Modify: `src/core/knowledge/client/ui/knowledge-graph-explorer.tsx`

**Interfaces:**
- Consumes: `neighborIds` (Task 1); `GraphCanvas` `highlightIds` prop (Task 3).
- Produces: no new exports. Computes `highlightIds` from hover state and passes it down.

- [ ] **Step 1: Add hover state + highlight computation**

In `knowledge-graph-explorer.tsx`:

Add import:
```tsx
import { neighborIds } from "../viz/graph-viz";
```

Add top-level state:
```tsx
    const [hoverId, setHoverId] = useState<string | null>(null);
```

Compute highlight set (top-level `useMemo`, guarded):
```tsx
    const highlightIds = useMemo(() => {
        if (!hoverId || !filtered) return null;
        const set = neighborIds(filtered.links, hoverId);
        set.add(hoverId);
        return set;
    }, [hoverId, filtered]);
```

Wire hover into the canvas in the success return:
```tsx
            <GraphCanvas
                graph={filtered ?? data}
                highlightIds={highlightIds}
                onHoverNode={setHoverId}
                onClickNode={(n) => setSelected(n)}
                registerApi={registerApi}
            />
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm check` → clean.
Run: `pnpm dev`, `/graph`, hover a node.
Expected: the hovered node and its direct neighbors stay bright/glowing; all other nodes fade to ~12% opacity; moving off restores everything.

- [ ] **Step 3: Commit**

```bash
git add src/core/knowledge/client/ui/knowledge-graph-explorer.tsx
git commit -m "feat(knowledge): hover neighbor-highlight on the graph"
```

---

### Task 6: Search-to-focus (`graph-search.tsx`)

Type a query → the first label match centers, zooms, and highlights with its neighbors.

**Files:**
- Create: `src/core/knowledge/client/ui/graph-search.tsx`
- Modify: `src/core/knowledge/client/ui/knowledge-graph-explorer.tsx`

**Interfaces:**
- Consumes: `matchNodeByLabel` (Task 1); `GraphApi.focusNode` (Task 3).
- Produces: `GraphSearch` with props `{ onSubmit: (query: string) => void }`.

- [ ] **Step 1: Implement the search box**

Create `src/core/knowledge/client/ui/graph-search.tsx`:

```tsx
"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/frontend/components/ui/input";

export function GraphSearch({
    onSubmit,
}: {
    onSubmit: (query: string) => void;
}) {
    const [value, setValue] = useState("");
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(value);
            }}
            className="absolute top-4 right-4 z-10"
        >
            <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
                <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Buscar nodo…"
                    className="w-52 bg-background/70 pl-8 backdrop-blur"
                />
            </div>
        </form>
    );
}
```

- [ ] **Step 2: Wire search into the explorer**

In `knowledge-graph-explorer.tsx`:

Add import:
```tsx
import { matchNodeByLabel } from "../viz/graph-viz";
import { GraphSearch } from "./graph-search";
```

Add a submit handler (top-level, with other callbacks):
```tsx
    const onSearch = useCallback(
        (query: string) => {
            if (!filtered) return;
            const match = matchNodeByLabel(filtered.nodes, query);
            if (match) {
                setHoverId(match.id); // reuse highlight path
                apiRef.current?.focusNode(match.id);
            }
        },
        [filtered],
    );
```

Add `<GraphSearch onSubmit={onSearch} />` inside the success return, as a sibling of `<GraphLegend />`:
```tsx
            <GraphLegend active={activeTypes} onToggle={toggleType} />
            <GraphSearch onSubmit={onSearch} />
            <GraphCanvas ... />
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm check` → clean.
Run: `pnpm dev`, `/graph`, type part of a node's label, press Enter.
Expected: the canvas pans + zooms to that node and it highlights with its neighbors. A non-matching query does nothing.

- [ ] **Step 4: Commit**

```bash
git add src/core/knowledge/client/ui/graph-search.tsx src/core/knowledge/client/ui/knowledge-graph-explorer.tsx
git commit -m "feat(knowledge): search-to-focus a node in the graph"
```

---

### Task 7: Person scope filter

A dropdown scoping the view to one person's nodes (client-side over the loaded slice).

**Files:**
- Create: `src/core/knowledge/client/ui/graph-person-filter.tsx`
- Modify: `src/core/knowledge/client/ui/knowledge-graph-explorer.tsx`

**Interfaces:**
- Consumes: `distinctPersonIds`, `filterByPerson` (Task 1); shadcn `Select`.
- Produces: `GraphPersonFilter` with props `{ personIds: string[]; value: string | null; onChange: (personId: string | null) => void }`.

- [ ] **Step 1: Implement the person filter**

Create `src/core/knowledge/client/ui/graph-person-filter.tsx`:

```tsx
"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/frontend/components/ui/select";

const ALL = "__all__";

/** Short, opaque label for a personId (no person table yet). */
function personLabel(id: string): string {
    return `Persona ${id.slice(0, 6)}`;
}

export function GraphPersonFilter({
    personIds,
    value,
    onChange,
}: {
    personIds: string[];
    value: string | null;
    onChange: (personId: string | null) => void;
}) {
    if (personIds.length === 0) return null;
    return (
        <div className="absolute bottom-4 left-4 z-10">
            <Select
                value={value ?? ALL}
                onValueChange={(v) => onChange(v === ALL ? null : v)}
            >
                <SelectTrigger className="w-48 bg-background/70 backdrop-blur">
                    <SelectValue placeholder="Todas las personas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>Todas las personas</SelectItem>
                    {personIds.map((id) => (
                        <SelectItem key={id} value={id}>
                            {personLabel(id)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
```

- [ ] **Step 2: Wire person scope into the explorer**

In `knowledge-graph-explorer.tsx`:

Add imports:
```tsx
import { distinctPersonIds, filterByPerson } from "../viz/graph-viz";
import { GraphPersonFilter } from "./graph-person-filter";
```

Add state:
```tsx
    const [personId, setPersonId] = useState<string | null>(null);
```

Person options come from the FULL slice (so choices don't vanish when you filter):
```tsx
    const personIds = useMemo(
        () => (data ? distinctPersonIds(data.nodes) : []),
        [data],
    );
```

Apply person scope BEFORE type filter. Update the `filtered` memo to chain both:
```tsx
    const filtered = useMemo(() => {
        if (!data) return null;
        return filterByTypes(filterByPerson(data, personId), activeTypes);
    }, [data, personId, activeTypes]);
```

Add the control in the success return (sibling of legend/search):
```tsx
            <GraphPersonFilter
                personIds={personIds}
                value={personId}
                onChange={setPersonId}
            />
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm check` → clean.
Run: `pnpm dev`, `/graph`.
Expected: if the loaded nodes carry `personId`s, a dropdown appears bottom-left; picking one narrows the constellation to that person's nodes + internal links; "Todas las personas" restores all. If no node has a `personId`, the dropdown is absent (correct).

- [ ] **Step 4: Commit**

```bash
git add src/core/knowledge/client/ui/graph-person-filter.tsx src/core/knowledge/client/ui/knowledge-graph-explorer.tsx
git commit -m "feat(knowledge): person scope filter for the graph"
```

---

### Task 8: Node detail panel (`node-detail-panel.tsx`)

Clicking a node slides in a panel with its metadata and neighbors. No source URL (not in the payload).

**Files:**
- Create: `src/core/knowledge/client/ui/node-detail-panel.tsx`
- Modify: `src/core/knowledge/client/ui/knowledge-graph-explorer.tsx`

**Interfaces:**
- Consumes: `VizNode`, `VizGraph`, `neighborIds`, `NODE_TYPE_COLORS`, `NODE_TYPE_LABELS` (Task 1); `motion` for the slide.
- Produces: `NodeDetailPanel` with props `{ node: VizNode | null; graph: VizGraph; onClose: () => void; onSelectNeighbor: (id: string) => void }`.

- [ ] **Step 1: Implement the panel**

Create `src/core/knowledge/client/ui/node-detail-panel.tsx`:

```tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { cn } from "@/frontend/lib/utils";
import {
    NODE_TYPE_COLORS,
    NODE_TYPE_LABELS,
    neighborIds,
    type VizGraph,
    type VizNode,
} from "../viz/graph-viz";

export function NodeDetailPanel({
    node,
    graph,
    onClose,
    onSelectNeighbor,
}: {
    node: VizNode | null;
    graph: VizGraph;
    onClose: () => void;
    onSelectNeighbor: (id: string) => void;
}) {
    return (
        <AnimatePresence>
            {node ? (
                <motion.aside
                    key={node.id}
                    initial={{ x: 320, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 320, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 34 }}
                    className="absolute top-4 right-4 bottom-4 z-20 flex w-80 flex-col gap-3 overflow-y-auto rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span
                                className="size-3 rounded-full"
                                style={{
                                    backgroundColor: NODE_TYPE_COLORS[node.type],
                                }}
                            />
                            <span className="text-muted-foreground text-xs uppercase tracking-wide">
                                {NODE_TYPE_LABELS[node.type]}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={onClose}
                        >
                            <X className="size-4" />
                            <span className="sr-only">Cerrar</span>
                        </Button>
                    </div>

                    <h2 className="font-semibold text-foreground text-sm leading-tight">
                        {node.label}
                    </h2>

                    {node.summary ? (
                        <p className="text-muted-foreground text-sm">
                            {node.summary}
                        </p>
                    ) : null}

                    <dl className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <dt className="text-muted-foreground">Origen</dt>
                            <dd className="text-foreground">{node.origin}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Confianza</dt>
                            <dd className="text-foreground">
                                {Math.round(node.confidence * 100)}%
                            </dd>
                        </div>
                    </dl>

                    <NeighborList
                        graph={graph}
                        nodeId={node.id}
                        onSelect={onSelectNeighbor}
                    />
                </motion.aside>
            ) : null}
        </AnimatePresence>
    );
}

function NeighborList({
    graph,
    nodeId,
    onSelect,
}: {
    graph: VizGraph;
    nodeId: string;
    onSelect: (id: string) => void;
}) {
    const ids = neighborIds(graph.links, nodeId);
    const neighbors = graph.nodes.filter((n) => ids.has(n.id));
    if (neighbors.length === 0) return null;
    return (
        <div className="mt-1">
            <p className="mb-1.5 text-muted-foreground text-xs">
                Conexiones ({neighbors.length})
            </p>
            <ul className="flex flex-col gap-1">
                {neighbors.map((n) => (
                    <li key={n.id}>
                        <button
                            type="button"
                            onClick={() => onSelect(n.id)}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted",
                            )}
                        >
                            <span
                                className="size-2 shrink-0 rounded-full"
                                style={{
                                    backgroundColor: NODE_TYPE_COLORS[n.type],
                                }}
                            />
                            <span className="truncate text-foreground">
                                {n.label}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

> Verify the motion import path: this repo uses `motion` v12. If `motion/react` does not resolve, use `import { AnimatePresence, motion } from "motion/react"` per the v12 API (confirm against `node_modules/motion/package.json` exports; do NOT fall back to the deprecated `framer-motion` package, which is not a dependency).

- [ ] **Step 2: Wire the panel into the explorer**

In `knowledge-graph-explorer.tsx`:

Add import:
```tsx
import { NodeDetailPanel } from "./node-detail-panel";
```

You already have `const [selected, setSelected] = useState<VizNode | null>(null);` — ensure it is `selected` (not `_`) so it can be read. Add a neighbor-select handler:
```tsx
    const onSelectNeighbor = useCallback(
        (id: string) => {
            const n = (filtered ?? data)?.nodes.find((x) => x.id === id);
            if (n) {
                setSelected(n);
                apiRef.current?.focusNode(id);
            }
        },
        [filtered, data],
    );
```

Render the panel in the success return (last child, above the closing div):
```tsx
            <NodeDetailPanel
                node={selected}
                graph={filtered ?? data}
                onClose={() => setSelected(null)}
                onSelectNeighbor={onSelectNeighbor}
            />
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm check` → clean.
Run: `pnpm dev`, `/graph`, click a node.
Expected: a panel slides in from the right showing type badge, label, summary (if any), origin, confidence %, and a clickable neighbor list; clicking a neighbor re-centers and swaps the panel; the X closes it.

- [ ] **Step 4: Full-suite check + commit**

Run: `pnpm vitest run && pnpm typecheck && pnpm check`
Expected: all pass, clean.

```bash
git add src/core/knowledge/client/ui/node-detail-panel.tsx src/core/knowledge/client/ui/knowledge-graph-explorer.tsx
git commit -m "feat(knowledge): node detail panel with neighbor navigation"
```

---

## Self-Review Notes

- **Spec coverage:** route + sidebar (T2), force-graph lib + constellation encoding (T3), type toggles (T4), hover-highlight (T5), search-focus (T6), person scope (T7), detail panel (T8), pure helpers + tests (T1), theming (dark radial bg + glow in T3, colors in T1). All spec sections mapped.
- **Deviation from spec (intentional):** spec's detail panel mentioned a "source-doc link if url" — removed because `nodeSchema` carries no URL (only `sourceChunkId`). Documented in Task 8 and Global Constraints. A future task could add a `GET /graph/node/:id/source` endpoint; out of scope here.
- **Hooks safety:** several tasks stress that `useState`/`useMemo`/`useCallback`/`useRef` must sit at the top of `KnowledgeGraphExplorer`, above the early-return guards, with `data`-null guards inside the memos. This is called out in T3/T4/T7 implementer notes.
- **Type consistency:** `VizNode`/`VizLink`/`VizGraph`, `GraphApi.focusNode`, `highlightIds`, `filterByTypes`/`filterByPerson`/`neighborIds`/`matchNodeByLabel`/`distinctPersonIds` names are used identically across tasks.
- **Version risks to confirm at build:** `react-force-graph-2d` default export + client-only load (T3); `motion/react` import path (T8). Both have explicit fallback instructions.
