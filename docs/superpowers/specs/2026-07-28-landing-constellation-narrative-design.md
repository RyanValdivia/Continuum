# Landing Constellation Narrative

**Date:** 2026-07-28
**Status:** Approved
**Supersedes:** `2026-07-28-landing-stage-card-motion-design.md`

## Goal

Replace the four isolated product cards in `Cómo funciona` with one continuous,
shader-backed visual system that turns connected sources into an evolving
knowledge graph and then makes a decision path visible.

The experience targets startup founders and technical team leaders. Its job is
to create progressive interest: each phase must resolve one question while
visually introducing the next phase, so the user wants to keep scrolling.

## Why the current treatment changes

The current implementation explains the four stages, but its source rows,
four-node diagram, question-and-answer card, and freshness list read as separate
UI samples. They understate the product and leave too much empty shader space in
the pinned viewport. The `Consultar` scene also positions Continuum too narrowly
as a question-answering product.

The replacement must feel like one living system rather than four cards:

1. connected tools contribute context;
2. context becomes an organic knowledge graph;
3. the graph reveals the context behind a decision;
4. new context becomes a real node and changes the graph.

## Preserved system

- Keep the existing Lumen night layout, Instrument Serif display type, Geist body
  type, azure anchor, coral verb landmark, spacing scale, shell width, and stage
  rail.
- Keep four stages in the same order and retain the desktop pinned narrative.
- Keep one Paper Shaders WebGL instance behind the complete pinned sequence.
- Keep the current landing route, section order, component ownership, and dark
  marketing surface.
- Keep mobile and reduced-motion experiences readable without pinned spatial
  motion.
- Add no animation, graph, or icon dependency. Use installed GSAP,
  `@gsap/react`, Paper Shaders, local SVG marks, and existing Lucide icons.
- Do not add metrics, customer logos, integration claims, or product capabilities
  that the repository does not support.

## Experience structure

### One apparatus, four phases

A single `StageScreen` remains mounted throughout the pinned sequence. It does
not crossfade between four unrelated mockups. `activeStage` moves the same DOM
and SVG elements between four stable visual states.

The left column retains stage copy. The right side becomes a borderless,
full-height constellation apparatus that may extend beyond its nominal grid
column. It has no card background, fake browser chrome, repeated source rows, or
separate panel for each stage.

The Paper Shader supplies persistent atmospheric motion. DOM and SVG elements
carry the narrative. The shader never carries essential meaning.

### Handoffs

Each phase ends by exposing the object used by the next phase:

- source context packets converge before the graph appears;
- graph clusters settle before the decision route lights;
- the decision route remains visible when a new signal enters;
- the new signal finishes as a graph node, leaving the final state ready to loop
  or hand off to the following landing section.

No phase may end on an empty shader-only frame.

## Phase 1 — Conectar

### Message

- Kicker: `Conectar`
- Timing label: `Día uno`
- Title: `Conecta lo que tu equipo ya sabe`
- Body: `Notion, Slack, Microsoft 365 y tus documentos siguen donde están. Continuum incorpora decisiones, conversaciones, personas y criterios sin obligar al equipo a migrar.`
- Chips: `Sin migración` and `Contexto desde el origen`

### Visual behavior

The first phase must feel dense enough to establish an ecosystem immediately.
It contains:

- confirmed source marks for Notion, Slack, Microsoft 365, and uploaded
  documents;
- Microsoft 365 artifact marks such as Teams conversations, OneDrive or
  SharePoint files, and Word, Excel, and PowerPoint documents;
- generic document artifacts such as PDF, policy, deck, and note;
- context packets labelled by meaning: decision, conversation, document, person,
  criterion, and agreement.

Packet colors map explicitly to the graph model: person maps to `person`;
decision and agreement map to `decision`; document and conversation map to
`document`; criterion maps to `criterion`. This mapping preserves color and
identity when packets become graph nodes.

Use 12–16 visible source or artifact marks at desktop width. Marks follow
irregular depth-aware paths around the Continuum core; they must not form four
rows or a perfect circular ring. Larger provider anchors sit farther from the
core while smaller artifacts and context packets occupy the depth between them.

Curved connector paths and travelling particles make causality explicit: tools
are not decoration around Continuum; they are sending context into it. The core
brightens as packets arrive.

Only confirmed integrations may appear as provider brands. Density beyond the
confirmed providers comes from their artifacts and generic document types, not
from unsupported third-party logos.

## Phase 2 — Mapear

### Message

- Kicker: `Mapear`
- Timing label: `En segundo plano`
- Title: `El contexto encuentra sus relaciones`
- Body: `Cada página, hilo y documento se conecta con las personas, decisiones, proyectos y criterios que le dan significado. Continuum conserva relaciones, no otra copia aislada.`
- Chips: `Grafo automático` and `Relaciones vivas`

### Visual behavior

Source marks and packets contract toward the core. The same packet colors then
reappear as graph nodes; the transition must read as transformation, not as a
cut to a different illustration.

The graph uses a deterministic force-directed-looking layout:

- 32 semantic nodes;
- 44–56 edges;
- four irregular clusters: people, decisions, documents, and criteria;
- 4–6 visible hubs with larger radii;
- small peripheral nodes and several cross-cluster edges;
- labels only on cluster names and important hubs.

The graph must not resemble a solar system. It has no concentric node rings and
no evenly distributed spokes. Clusters drift independently by a few pixels,
edges remain attached to their nodes, and the graph camera oscillates within a
small rotation and scale range. This supplies the requested sense that the graph
turns and evolves without sacrificing legibility.

## Phase 3 — Decidir

### Message

- Kicker: `Decidir`
- Timing label: `Antes de actuar`
- Title: `Cada decisión llega con su contexto`
- Body: `Continuum reúne precedentes, criterios, personas y documentos relevantes para que el equipo decida sin reconstruir la historia.`
- Chips: `Contexto compartido` and `Criterios conectados`

### Visual behavior

This phase replaces the current question, answer, and citation cards. It must not
look like chat or imply that Continuum is only useful for queries.

When the phase activates:

1. graph movement slows but does not stop;
2. unrelated nodes and edges reduce in opacity;
3. one route across all four semantic clusters becomes prominent;
4. route nodes receive a restrained scale and light emphasis;
5. a coral path particle travels through the relevant nodes;
6. a `Decisión` focus resolves with the status `Contexto reunido`.

The visible route communicates that decisions inherit people, precedents,
documents, and criteria. It does not display a fabricated business decision,
answer, score, percentage, or recommendation.

## Phase 4 — Mantener

### Message

- Kicker: `Mantener`
- Timing label: `Continuo`
- Title: `Cada señal hace evolucionar el grafo`
- Body: `Cada sincronización incorpora lo nuevo como nodos y relaciones. El contexto cambia con el equipo, sin mantenimiento manual.`
- Chips: `Sync continuo` and `Topología viva`

### Visual behavior

Phase four must show real graph integration, not a floating status badge.

1. A new context signal enters from a source at the edge of the apparatus.
2. It follows a curved path toward the semantically correct cluster.
3. The signal shrinks into a normal graph node and adopts that cluster's color,
   radius, border, and motion behavior.
4. At least three new edges appear between the node, its cluster hub, and one
   cross-cluster relationship.
5. Nearby nodes shift slightly to make room; the graph camera and cluster motion
   continue.
6. A low-amplitude wave passes through the graph and the decision route
   recalibrates without disappearing.
7. The integrated node remains part of the graph during the final hold.

For an active-stage loop, reset only after the completed graph has held long
enough to read. The reset happens at low opacity before the next incoming signal,
so the node never visibly teleports out of the graph.

## Motion architecture

### Scoped GSAP ownership

`StageScreen` owns one scoped `useGSAP` context and two apparatus timeline
layers:

- a phase-transition timeline that moves the apparatus from its current visual
  state to `activeStage`;
- one ambient timeline for the active phase.

Shader-wrapper motion is separate because `BrandShader` is a sibling of
`StageScreen`, outside its scoped selector tree. `LandingStages` passes
`activeStage` to `BrandShader`; `BrandShader` owns its wrapper ref and a small
scoped `useGSAP` timeline for phase opacity and scale.

When `activeStage` changes, kill the previous ambient timeline, animate from
current computed values with `overwrite: "auto"`, then start the next ambient
loop. Reverse scrolling must transition to the earlier state from the current
state rather than resetting the complete apparatus.

Ambient behavior by phase:

- Conectar: source depth drift and context packets;
- Mapear: cluster drift and small camera oscillation;
- Decidir: route emphasis and periodic path pulse;
- Mantener: signal-to-node integration and graph recalibration.

Only the visible desktop apparatus may loop. Pause all internal timelines when
the pinned section leaves the viewport, when the document is hidden, or when
reduced motion is requested.

### Animation limits

- Animate `x`, `y`, `scale`, `rotation`, and `autoAlpha`.
- Use opacity and short staggered reveals for SVG edges; do not continuously
  animate every edge stroke.
- Do not animate layout properties or update React state every frame.
- Do not run a force simulation, manual `requestAnimationFrame` loop, or
  per-frame `getBoundingClientRect` calls.
- Use deterministic node coordinates so SSR, tests, and screenshots are stable.
- Keep the graph below 40 nodes and 60 edges.
- Apply `will-change` only while the apparatus is active.

## Shader treatment

Add a `constellation` preset to `BrandShader` rather than mounting another
shader. It remains a dynamically imported `NeuroNoise` instance with SSR
disabled.

The preset increases presence relative to the current `field` treatment while
remaining behind content:

- deeper azure midtone;
- azure foreground;
- modestly higher wrapper opacity;
- slow intrinsic speed;
- no per-frame React uniform updates.

`LandingStages` switches the call site to `variant="constellation"`, removes the
hardcoded `opacity-[0.2]` override, and passes `activeStage`. `BrandShader`
animates only its own wrapper opacity and scale. Coral (`--brand-chord`) is
reserved for the decision route; azure (`--primary`) marks live context and graph
integration. No third accent token is introduced.

## Layout and scroll rhythm

Preserve the two-column Lumen composition, but remove the visual card boundary.
The left copy uses the existing shell and display scale. The apparatus fills the
right side vertically and may bleed toward the viewport edge.

To remove the current empty handoff:

- reduce the desktop gap between `SectionHead` and the first pinned scene;
- vertically center the first phase within the useful viewport rather than
  top-aligning a 28rem card inside `100svh`;
- let the constellation occupy the space above and below its nominal column;
- keep the progress rail near the lower safe area without leaving a large
  shader-only band above it.

Keep four equal narrative intervals. Copy transitions and apparatus transitions
overlap so each incoming phase is already visible before the previous phase has
fully resolved. Avoid long holds with no visual change.

## Responsive behavior

### Desktop motion

At `min-width: 64rem` with motion allowed, use the pinned four-phase experience.
The apparatus remains mounted once and receives `activeStage` updates.

### Mobile and reduced motion

Do not pin or loop.

Render one static composite showing:

- supported source marks contributing context;
- the completed organic graph;
- the decision route;
- the phase-four node fully integrated with its new edges.

Place the four text stages in normal document flow with dividers rather than
full-viewport panels. Do not repeat the visual four times. At 320, 375, 414, and
768 px there must be no horizontal scroll, clipped essential labels, or
100svh-sized empty areas.

`prefers-reduced-motion: reduce` renders this completed composite immediately.
No spatial animation or loop runs; an opacity crossfade of at most 150ms is
allowed.

## Accessibility

- Keep the visible cinematic apparatus `aria-hidden="true"`.
- Keep one screen-reader `ol` as the semantic source of truth, using the revised
  stage copy and summaries.
- Add a single hidden figure caption describing the complete transformation.
- Provider marks, particles, graph geometry, and shader remain decorative.
- Do not encode a stage, cluster, or decision route through color alone; the
  screen-reader copy states each relationship.
- Preserve `aria-current="step"` on the progress rail.

Revised summaries:

1. `Notion, Slack, Microsoft 365 y documentos aportan decisiones, conversaciones, personas y criterios a Continuum.`
2. `Continuum organiza ese contexto en un grafo de personas, decisiones, documentos y criterios relacionados.`
3. `Una decisión conecta su contexto relevante: precedentes, personas, documentos y criterios.`
4. `Una señal nueva se integra como nodo, crea relaciones y modifica el grafo.`

## Component boundaries

### Modify

- `src/frontend/components/landing/stages.tsx`
  - revise stage three from `Consultar` to `Decidir`;
  - revise all approved stage copy and accessibility summaries;
  - mount one `StageScreen` outside the per-stage copy loop;
  - preserve active stage and progress ownership;
  - call `BrandShader` with `variant="constellation"` and `activeStage`, removing
    the hardcoded opacity override;
  - tighten desktop spacing and provide static mobile structure.
- `src/frontend/components/landing/stage-screens.tsx`
  - replace the four card implementations with the continuous constellation;
  - own scoped transition and ambient timelines;
  - render providers, context paths, organic graph, decision route, and incoming
    signal integration.
- `src/frontend/components/landing/brand-shader.tsx`
  - accept `activeStage`;
  - add the single `constellation` preset and a stable wrapper motion target;
  - own its wrapper-scoped phase opacity and scale timeline.
- `src/frontend/components/landing/motion.tsx`
  - preserve pin/progress behavior;
  - expose section visibility if needed to pause ambient motion;
  - remove long visually idle handoffs without adding per-frame React state.
- `src/app/globals.css`
  - remove reduced-motion `100svh` gaps;
  - add only layout rules that cannot remain local utility classes.
- `src/frontend/components/landing/__tests__/stage-screens.test.ts`
  - replace card-count contracts with constellation, graph, decision, and
    integration contracts.
- `src/frontend/components/landing/__tests__/landing-stages.test.ts`
  - assert revised copy, one persistent apparatus, semantic stage order, and
    accessible summaries.

### Create

- `src/frontend/components/landing/stage-screen-data.ts`
  - typed provider and artifact registry;
  - deterministic graph nodes, edges, clusters, decision route, and phase-four
    integration target.
- `src/frontend/components/landing/__tests__/stage-screen-data.test.ts`
  - graph integrity and route/reference validation.

### Delete

No production files.

## Data contracts

Graph data must use stable IDs:

```ts
type GraphCluster = "person" | "decision" | "document" | "criterion";

type LandingGraphNode = {
    id: string;
    cluster: GraphCluster;
    label?: string;
    radius: number;
    x: number;
    y: number;
    hub?: boolean;
    introducedInPhase?: 2 | 4;
};

type LandingGraphEdge = {
    id: string;
    source: LandingGraphNode["id"];
    target: LandingGraphNode["id"];
    decisionRoute?: boolean;
    introducedInPhase?: 2 | 4;
};
```

Every edge endpoint must exist. The decision route must include at least one node
from each cluster. The phase-four node must have at least three phase-four edges,
including one edge to its cluster hub and one cross-cluster edge.

## Testing and verification

### Automated

#### Checkpoint A — graph foundation

1. Add failing tests for graph integrity: unique IDs, valid endpoints, 32 nodes,
   44–56 edges, four clusters, and valid hub references.
2. Test that the decision route touches all four clusters.
3. Test that the phase-four node lives inside the graph dataset, has at least
   three new edges, connects to its hub, and has a cross-cluster edge.
4. Render the deterministic graph and run its focused data and markup tests
   before adding choreography.

#### Checkpoint B — narrative choreography

1. Add failing tests for revised stage copy and the absence of the old question,
   answer, and citation UI.
2. Test source density and verify that branded provider marks come only from the
   approved source registry.
3. Test one persistent apparatus, four semantic stages, one active progress
   step, and phase-specific GSAP targets.
4. Add source convergence, decision-route, integration, responsive, and
   reduced-motion behavior; run focused landing tests after each phase.

#### Final verification

Run `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. If the known
unrelated Eden treaty type-ceiling blocker still prevents `typecheck` or `build`,
record its exact baseline diagnostics and verify that this work adds no new
diagnostic before handoff.

### Visual

Review desktop at 1440 × 900 and 1280 × 720:

- no empty shader handoff after the section heading;
- phase one feels dense and clearly shows sources contributing context;
- phase-one marks form an irregular depth field, not rows or a perfect ring;
- phase two reads as an irregular graph rather than a ring or four-node diagram;
- graph clusters drift and camera movement remains restrained;
- phase three communicates decision context without chat UI;
- phase four visibly converts a signal into a graph node and attached edges;
- reverse scrolling reconstructs earlier phases without a flash or reset;
- shader remains atmospheric and text contrast stays readable.

Review 320, 375, 414, and 768 px plus desktop reduced motion:

- no pin, loop, horizontal overflow, or full-viewport empty block;
- one final-state composite is complete and legible;
- the new phase-four node is already integrated;
- all four text stages remain in semantic order.

### Performance

Use browser performance tooling during one complete pinned pass:

- one WebGL canvas only;
- no hidden stage loops;
- no continuous React renders during scroll;
- no layout animation warnings;
- no persistent animation after the section leaves the viewport.
