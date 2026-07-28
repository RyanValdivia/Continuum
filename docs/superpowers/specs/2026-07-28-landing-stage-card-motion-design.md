# Landing Stage Card Motion

**Date:** 2026-07-28
**Status:** Approved — preserve the pinned narrative and animate each stage card

## Goal

Keep the existing four-scene, shader-backed `Cómo funciona` narrative while
making each product card explain its stage through a scoped GSAP loop. Reduce
the empty visual handoff between the section heading and the first scene by
placing the desktop scene content higher in its viewport.

## Preserved behavior

- The scene order remains Conectar, Mapear, Consultar, Mantener.
- Desktop keeps the pinned, scrubbed scene transitions and one shared shader.
- Mobile and reduced-motion layouts remain readable static stacks.
- Existing copy, semantic tokens, progress UI, section order, and accessibility
  summaries remain unchanged.
- No new claims, metrics, dependencies, CSS custom properties, or routes.

## Motion approach

Only the active desktop scene runs its internal loop. Inactive scene timelines
stay paused so hidden cards do not consume animation work.

Each card owns one scoped `useGSAP` timeline:

1. **Conectar**
   - Source rows enter with a short vertical stagger.
   - Connector lines reveal from left to right using `scaleX`.
   - The Continuum destination confirms receipt with a restrained scale pulse.
2. **Mapear**
   - Relationship nodes enter in a stagger.
   - Existing graph edges fade into view.
   - The central graph node resolves last with one restrained scale pulse.
3. **Consultar**
   - The role question enters first.
   - The answer follows.
   - Source citations resolve last in a stagger.
4. **Mantener**
   - Source rows enter in sequence.
   - Their status labels resolve to `Actualizado`.
   - `Grafo al día` confirms the completed cycle.

Loops include a quiet hold before restarting. They use GSAP timelines and
position parameters rather than chained delays.

## Accessibility and performance

- Every timeline is scoped to its own card ref through `useGSAP`.
- Animate compositor-friendly `x`, `y`, `scale`, `scaleX`, and `autoAlpha`.
- Do not animate layout properties.
- `prefers-reduced-motion: reduce` renders the complete end state without
  spatial motion or looping.
- Existing visible and screen-reader content stays in semantic DOM order.
- No motion target carries essential information that is absent from text.

## Layout adjustment

On desktop, align each full-scene panel toward the top portion of the viewport
instead of vertically centering it. Keep mobile stacking unchanged. The shared
shader remains behind the complete scene and becomes supporting atmosphere,
not the first dominant object after the heading.

## Component boundaries

- `landing/stages.tsx`
  - Owns the active scene index.
  - Passes `active` into each `StageScreen`.
  - Tightens desktop scene alignment.
- `landing/stage-screens.tsx`
  - Owns the four card timelines and their scoped motion hooks.
  - Keeps each visualization private and focused.
- `landing/__tests__/stage-screens.test.ts`
  - Verifies each stage exposes its expected semantic content and dedicated
    GSAP motion targets.

No changes are required in the shared pinned-scene timeline or global design
tokens.

## Verification

1. Add a failing focused test for each card's required motion hooks.
2. Implement the minimum markup and timelines to pass it.
3. Run focused landing tests.
4. Run `pnpm check`, `pnpm typecheck`, and `pnpm build`.
5. Review desktop at 1440 × 900:
   - no empty handoff after the section heading;
   - only the visible card loops;
   - reverse scrolling activates the correct card;
   - shader stays behind the card.
6. Review 320, 375, 414, and 768 px:
   - cards stack;
   - no horizontal overflow;
   - content remains readable.
7. Review desktop reduced motion:
   - all cards show complete end states;
   - no looping or spatial movement.
