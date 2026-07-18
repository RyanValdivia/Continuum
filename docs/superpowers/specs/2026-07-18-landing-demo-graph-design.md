# Continuum Landing — Interactive Demo (Knowledge Graph + Roadmap)

**Date:** 2026-07-18
**Status:** Shipped

## Goal

An interactive demo section on the landing that plots each person's **living
knowledge** as a graph and turns it into Continuum's output: an onboarding
**roadmap**. Each **puesto** (role) has an agent holding **documentos**,
**decisiones** and **criterios**; hovering a puesto reveals that knowledge as
connections, and clicking it shows a roadmap table — "qué dominar para ocupar
ese puesto". A subtle WebGL shader sits behind the canvas.

## SDK decisions

- **Graph:** `@xyflow/react` (React Flow) v12 — DOM nodes for crisp, token-styled
  knowledge cards; built-in drag/pan/hover/click.
- **Backdrop:** `@paper-design/shaders-react` Dithering shader (brand `#0088f7`),
  `next/dynamic` `ssr:false`. Visible in both themes (higher opacity + screen
  blend in dark).
- Brand tool logos were explored first (Simple Icons CDN) but the concept moved
  from "tools" to **knowledge artifacts** per the product's value prop.

## Placement

Between **Cómo funciona** and **Competencia**:
`Hero → Problema → Cómo funciona → Demo → Competencia → CTA → Footer`.

## Graph model

- **Hub:** `Continuum · Memoria viva` (center, filled primary).
- **Puestos (4):** Head of Sales · Product Manager · Data Analyst · Marketing
  Lead — role cards with initial + "Agente".
- **Knowledge (5 reused slots):** each puesto has 5 knowledge items rendered in
  fixed scatter positions. Types: `documento` (FileText), `decision`
  (GitBranch), `criterio` (Compass), each with a type tag + invented label
  (e.g. "PRD · Roadmap 2026", "Descuento máx. 15% sin aprobar", "Impacto sobre
  esfuerzo"). Only the active puesto's 5 knowledge nodes are shown; the slots
  are reused (10 nodes total, not 20+).

Content (documents/decisions/criterios + the roadmap) is invented but realistic,
defined in `graph-data.ts`.

## Interactivity

- **Hover** a puesto → its knowledge nodes appear, edges puesto→knowledge and
  puesto→hub animate in `primary`, other puestos dim.
- **Click** a puesto → selects it (persists after mouse-out) and renders the
  **roadmap panel** below. Click again / click the canvas → deselect.
- `active = hovered ?? selected` drives the graph; `selected` drives the roadmap.
- View framed with a fixed `fitBounds` so revealed knowledge never clips.
  Scroll-zoom disabled (`preventScrolling={false}`) so the page still scrolls.
  Attribution hidden.

## Roadmap output (the point of the demo)

Below the graph, a table appears for the selected puesto:
**Roadmap de onboarding · {puesto}** / "El output de Continuum: qué dominar para
ocupar este puesto." Columns: **Etapa · Qué dominar · Basado en · Resultado**,
~4 rows, each traced back to one of the person's documents/decisions/criterios.
Animated in/out with `motion` + `AnimatePresence` (honors reduced-motion).

## Component structure

`src/frontend/components/landing/demo/`:

- `demo-section.tsx` — server shell: heading + `<DemoExperience/>`.
- `demo-experience.tsx` — `"use client"` boundary: owns `hovered`/`selected`,
  composes the graph card (shader + graph) and the roadmap panel.
- `knowledge-graph.tsx` — React Flow instance; reacts to the `active` prop.
- `nodes.tsx` — `PuestoNode`, `KnowledgeNode`, `HubNode`.
- `roadmap-panel.tsx` — the roadmap table / placeholder.
- `shader-backdrop.tsx` — dynamic dithering shader.
- `graph-data.ts` — puestos, knowledge, roadmaps, node layout.

`DemoExperience` is the only `"use client"` boundary; the graph/roadmap modules
are reached through it (avoids server→client function-prop warnings).

## Non-goals / notes

- No backend — all content is static curated data.
- Knowledge slots are reused across puestos (positions fixed); only one puesto's
  knowledge is visible at a time.
- `@paper-design/shaders-react` peer wants `react-dom >= 19.2.6` (project has
  `19.2.4`); works in practice — fall back to the soft glow if it ever breaks.

## Verification

`pnpm typecheck` · `pnpm check` · `pnpm build` all green. Browser: hover reveals
each puesto's documents/decisions/criterios; click renders the roadmap table;
fit never clips; dark mode + shader confirmed; page scroll not trapped.
