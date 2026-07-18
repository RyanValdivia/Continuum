# Continuum Landing — Interactive Demo (Knowledge Graph)

**Date:** 2026-07-18
**Status:** Approved

## Goal

Add an interactive demo section to the landing that plots Continuum's
**knowledge graph**: a central hub, several **puesto** (role) nodes each with
its agent, connected to the **tools** (Gmail, Notion, Slack, Drive, Calendar,
HubSpot) where their work lives. Hovering/clicking a puesto highlights its
connections. A subtle WebGL "video effect" backdrop sits behind the canvas.

## SDK decisions

- **Graph:** `@xyflow/react` (React Flow) v12 — DOM nodes make brand logos +
  role labels crisp and easy to style to tokens; built-in drag/pan/hover/click.
- **Backdrop:** `@paper-design/shaders-react` Dithering shader (brand `#0088f7`,
  low opacity), loaded via `next/dynamic` `ssr:false` (WebGL, hydration-safe).
- **Logos:** LobeHub static mono SVGs via jsDelivr CDN `<img>` (no new dep),
  same approach as the myworkin reference landing.

## Placement

New section between **Cómo funciona** and **Competencia**:
`Hero → Problema → Cómo funciona → Demo → Competencia → CTA → Footer`.

## Graph content

| Node type | Nodes |
|-----------|-------|
| Hub | `Continuum · Memoria` (center, filled primary) |
| Puestos | Head of Sales · Product Manager · Data Analyst · Marketing Lead |
| Tools | Gmail · Notion · Slack · Google Drive · Calendar · HubSpot |

Edges: each puesto → hub; each puesto → its tools. Mapping:

- Head of Sales → Gmail, Slack, HubSpot, Calendar
- Product Manager → Notion, Slack, Calendar
- Data Analyst → Notion, Google Drive, Slack
- Marketing Lead → Gmail, Notion, HubSpot

LobeHub slugs: `gmail`, `notion`, `slack`, `googledrive`, `googlecalendar`,
`hubspot`.

## Interactivity

- Nodes draggable; pan enabled. **Scroll-zoom disabled** so page scroll is not
  trapped; zoom via on-canvas buttons only. `fitView` on mount.
- Curated fixed node positions (not auto-layout) for an intentional, minimal
  composition.
- Hover or click a puesto → its edges + connected tool nodes glow `primary`,
  everything else dims. A caption below the canvas updates:
  *"El agente de {puesto} conecta: {tools}."* Default caption prompts
  interaction.
- React Flow attribution hidden (`proOptions={{ hideAttribution: true }}`).

## Look

- Section heading: eyebrow "Demo" · H2 "El grafo de conocimiento de tu
  empresa." · sub explaining puesto→agente→tools · hint line "Arrastra los
  nodos · pasa el cursor sobre un puesto."
- Canvas in a bordered `card` container, ~460px tall, `relative
  overflow-hidden`; dithering shader absolutely positioned behind (`z-0`,
  low opacity), React Flow above (`z-10`).
- Nodes styled to tokens: puesto = `card`/`border` with avatar initial + role +
  small "Agente" tag; tool = circular `card` with logo; hub = filled `primary`.
- Edges use `primary`; dimmed state uses `muted-foreground`/opacity. Theme-aware
  (light/dark) via tokens; shader color is a fixed brand hex.

## Component structure

`src/frontend/components/landing/demo/`:

- `demo-section.tsx` — server section shell: heading, hint, backdrop, mounts the graph.
- `knowledge-graph.tsx` — `"use client"` React Flow instance + highlight state + caption.
- `nodes.tsx` — `PuestoNode`, `ToolNode`, `HubNode` custom node components.
- `graph-data.ts` — typed nodes, edges, tool metadata (slug + label), puesto→tools map.
- `shader-backdrop.tsx` — `"use client"` dynamic dithering shader wrapper.

Wire `<LandingDemo />` into `src/frontend/components/landing/index.tsx` after
`LandingHowItWorks`.

## Motion / a11y

- Under `prefers-reduced-motion`: shader `speed={0}` (frozen), no edge
  animation. Nodes remain draggable (user-initiated, allowed).
- Nav anchor: add `#demo` optionally (not required).

## Non-goals (YAGNI)

- No real data / backend — graph is static curated content.
- No auto-layout engine (dagre/elk) — positions are hand-set.
- No 3D / force physics.

## Risks

- `@paper-design/shaders-react` peer wants `react-dom >= 19.2.6`; project has
  `19.2.4`. Expected to work; if the shader errors at runtime, fall back to the
  existing soft blue glow (drop the shader dep) — the graph is the core.
- External CDN dependency for logos (jsDelivr). Acceptable for a demo; can be
  vendored locally later.

## Verification

`pnpm typecheck` · `pnpm check` · `pnpm build`, then browser at
`http://localhost:3000`: graph renders, logos load, drag works, hover/click
highlights a puesto's connections + updates caption, dark mode, reduced-motion
(shader frozen). Confirm page scroll is not trapped by the canvas.
