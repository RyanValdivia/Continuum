# Knowledge Graph Constellation — Design Spec

**Date:** 2026-07-18
**Status:** Approved for planning
**Author:** diego@workin2.com (with Claude)

## Goal

An in-app tool that renders an organization's live knowledge graph as a
force-directed "constellation" so users can explore their captured knowledge:
see the shape of it, hover to trace connections, search to a node, filter by
type or person, and click a node to read its detail.

This is a real utility over live data (`GET /api/v1/knowledge/graph`), not a
marketing demo. The existing landing-page demo (`landing/demo/*`, React Flow,
hardcoded) is untouched.

## Non-goals (YAGNI)

- No chat integration. The graph lives on its own route; chat stays on
  `/knowledge`. (Considered and deliberately deferred.)
- No editing of nodes/edges from the graph. Read-only visualization.
- No server-side layout or graph pagination. One bounded fetch (≤500 nodes),
  all interaction client-side.
- No WebGL / thousands-of-nodes scaling. 2D canvas is sufficient for the
  500-node API cap.

## Context (current state)

- **Schema** (`knowledge-schema.ts`): `knowledge_nodes` (id, organizationId,
  personId nullable, type `decision|process|concept|document`, label, summary,
  embedding, sourceChunkId, origin `sync|interview|manual`, confidence,
  createdAt) and `knowledge_edges` (id, from/toNodeId, type
  `relates_to|part_of|references|depends_on|caused_by`, weight, sourceChunkId).
  Directed, unique `(from,to,type)`.
- **API** already exists: `GET /graph?personId?&limit` (1–500, default 200),
  auth'd + org-scoped, returns `{ nodes, edges }` wire shapes (no vectors).
  Mounted at `/api/v1/knowledge/graph`.
- **App shell**: `/[slug]/app` layout enforces auth + active org. Sidebar nav
  is a `NAV` array in `app-sidebar.tsx`. Route segments render under it.
- **Deps present**: `@tanstack/react-query`, `motion`, `next-themes`,
  `lucide-react`, tailwind v4, radix-ui. `@xyflow/react` present but only used
  by the landing demo.

## Approach

### Route & data flow

- New route `src/app/[slug]/app/graph/page.tsx` — server component, inherits
  auth/org from the `[slug]/app` layout. Renders the client explorer.
- Sidebar: add `{ title: "Grafo", segment: "graph", icon: Waypoints }` to `NAV`.
- Client fetches `GET /api/v1/knowledge/graph?limit=200` (optionally
  `&personId=`) via a TanStack Query hook (`use-graph-query`). Filtering,
  highlighting, and search are all client-side over the fetched slice.

### Visualizer

- **Library**: `react-force-graph-2d` (canvas + d3-force). New dependency.
  Rendered client-only via `next/dynamic({ ssr: false })` because it touches
  `window`/`canvas`. A compat check against React 19 / Next 16 happens at
  install; the dynamic-import boundary isolates any SSR issues.
- **Data mapping**: nodes → force-graph nodes `{ id, label, type, origin,
  confidence, summary, personId, degree }`; edges → links
  `{ source: fromNodeId, target: toNodeId, type, weight }`.
- **Visual encoding**:
  - Node **color** by `type` — 4 theme-aware hues derived from brand tokens.
  - Node **radius** by **degree** (edge count), so hubs read larger.
  - Edge **thickness** by `weight`; subtle directional particles for flow.
  - Custom `nodeCanvasObject`: glowing dot + label beneath, hover/focus halo.

### Controls

1. **Type filter toggles** — 4 legend chips (decision / process / concept /
   document) top-left; also the color legend. Clicking hides/shows that type
   (filtered nodes + their edges drop out of the sim).
2. **Search / focus** — box top-right. Matching a node by label centers it,
   highlights its neighbors, fades the rest.
3. **Hover neighbor-highlight** — hover a node → it + direct edges + neighbors
   glow; everything else dims to ~10% opacity.
4. **Person scope** — dropdown. **Caveat:** no `person` table exists yet
   (`personId` is a plain column). MVP options = distinct `personId`s present in
   the loaded graph, short-labeled, plus "Todos". Upgrades to real names when a
   person domain lands. Selecting a person can re-fetch with `&personId=` or
   filter client-side (client-side chosen for MVP — no extra round-trip).

### Detail panel

- Click a node → slide-in right panel (motion): label, type badge, origin,
  confidence, summary, neighbor list (each click-to-focus), and a source-doc
  link when a `url` is available. Click background / close to dismiss.

### Theme & aesthetic

- Dark-first canvas with a radial vignette background; node glow via canvas
  `shadowBlur`. Colors from existing brand tokens, theme-aware via `next-themes`.
  `motion` drives panel + chip transitions. The force sim eases into layout on
  load, then cools to rest.

## Component breakdown

Each unit is small and single-purpose:

- `graph/page.tsx` — server route shell.
- `knowledge-graph-explorer.tsx` — client orchestrator: owns query, filter,
  hover, selection, search state; composes the pieces below.
- `graph-canvas.tsx` — the `react-force-graph-2d` wrapper (dynamic, ssr:false);
  props in, canvas out. No app state of its own beyond the sim ref.
- `graph-legend.tsx` — type chips / toggles.
- `graph-search.tsx` — search input + match logic callback.
- `node-detail-panel.tsx` — slide-in detail.
- `use-graph-query.ts` — TanStack Query hook for the graph slice.
- `graph-viz.ts` (pure helpers) — degree calc, type→color map, filter/highlight
  computation, distinct-personId extraction. **Unit-tested.**

## Testing

- Pure helpers in `graph-viz.ts` are unit-tested with vitest: degree counting,
  filtering by type set, neighbor computation, personId extraction, color map
  totality over the 4 node types.
- Canvas rendering is not unit-tested (jsdom/happy-dom can't render canvas);
  covered by manual verification and optionally an e2e smoke later.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| `react-force-graph-2d` on React 19 / Next 16 | Verify at install; dynamic `ssr:false` import isolates SSR; fall back to hand-rolled d3-force + canvas if broken. |
| Opaque `personId` (no person table) | Flagged; short-label ids + "Todos"; upgrade path when person domain lands. |
| Dense hairball at 200+ nodes | Degree-based sizing, hover-dim, type filters, and search all reduce visual load. |

## Files touched

- **New:** `graph/page.tsx`, `knowledge-graph-explorer.tsx`, `graph-canvas.tsx`,
  `graph-legend.tsx`, `graph-search.tsx`, `node-detail-panel.tsx`,
  `use-graph-query.ts`, `graph-viz.ts` (+ its test).
- **Edit:** `app-sidebar.tsx` (NAV entry), `package.json` (add
  `react-force-graph-2d`).
