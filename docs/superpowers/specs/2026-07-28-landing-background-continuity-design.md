# Continuum — Full-Scene Landing Narrative

**Date:** 2026-07-28
**Status:** Approved — full-scene direction selected

## Goal

Turn `Cómo funciona` into a cinematic, full-viewport scroll narrative. One
shader remains visible while four product screens replace each other as the
visitor scrolls. The rest of the landing uses one subtle, continuous square
grid instead of disconnected WebGL bands.

## Page rhythm

1. Hero on the continuous 48px grid.
2. Full-screen `Cómo funciona` sequence:
   - Conectar
   - Mapear
   - Consultar
   - Mantener
3. `Qué guarda`, live graph, sources, comparison, CTA, and footer return to
   normal document flow over the same continuous grid.

Copy, section order after `Cómo funciona`, palette, typography, routes, and CTA
behavior remain unchanged.

## Full-scene behavior

Desktop with motion enabled:

- Pin `Cómo funciona` at the top of the viewport with GSAP ScrollTrigger.
- Allocate one viewport of scroll distance to each of the four scenes.
- Keep one `BrandShader` mounted behind the complete sequence.
- Crossfade the outgoing and incoming scene with `autoAlpha` and a small
  `yPercent` transform.
- Drive a thin progress line through the same scrubbed timeline.
- Update the active stage marker only when scroll crosses an equal scene
  boundary.
- Pin the section element but animate only its children.

The four screens visualize:

1. Existing sources flowing into Continuum.
2. People, decisions, documents, and criteria becoming a graph.
3. A role agent answering with traceable sources.
4. Continuous sync keeping knowledge fresh.

No invented metrics, testimonials, or product claims are introduced.

## Responsive and reduced motion

- Pinning starts at `64rem`.
- Below `64rem`, render all four scenes as readable stacked panels.
- With `prefers-reduced-motion: reduce`, use the same stacked layout at every
  width.
- Do not mount the WebGL shader outside the desktop, motion-enabled mode.
- Preserve all scene content in semantic DOM order.
- Keep focus rings and CTA interactions unchanged.

## Background continuity

- Apply `.lumen-grid` once at the landing root.
- Render its lines at 3% foreground contrast.
- Remove per-section `.lumen-grid` instances so the pattern never restarts.
- Remove `BrandShader` from hero, `Qué guarda`, live graph, comparison callout,
  and final CTA.
- Use translucent semantic surfaces where content needs separation from the
  grid.

## Component boundaries

- `landing/stages.tsx` owns scene copy, progress UI, and full-scene composition.
- `landing/stage-screens.tsx` owns the four static product visualizations.
- `landing/motion.tsx` owns the reusable pinned ScrollTrigger timeline.
- `landing/scene-progress.ts` maps normalized scroll progress to an active scene
  index.
- `landing/brand-shader.tsx` owns the single desktop shader and its media/reduced
  motion mount gate.
- `landing/index.tsx` owns the page-wide grid.

## Expected files

Create:

- `src/frontend/components/landing/stage-screens.tsx`
- `src/frontend/components/landing/scene-progress.ts`
- `src/frontend/components/landing/__tests__/scene-progress.test.ts`

Modify:

- `src/frontend/components/landing/index.tsx`
- `src/frontend/components/landing/hero.tsx`
- `src/frontend/components/landing/stages.tsx`
- `src/frontend/components/landing/motion.tsx`
- `src/frontend/components/landing/brand-shader.tsx`
- `src/frontend/components/landing/continuity.tsx`
- `src/frontend/components/landing/demo/demo-section.tsx`
- `src/frontend/components/landing/comparison.tsx`
- `src/frontend/components/landing/cta.tsx`
- `src/app/globals.css`

Delete no files.

## Verification

1. Unit-test progress boundaries and clamping.
2. Run `pnpm test`.
3. Run `pnpm check`.
4. Run `pnpm typecheck`.
5. Run `pnpm build`.
6. Review desktop at 1440px:
   - section pins cleanly;
   - all four scenes appear in both scroll directions;
   - progress and active marker match the current scene;
   - shader remains one continuous canvas;
   - exit into `Qué guarda` has no jump or background seam.
7. Review 320px, 375px, 414px, and 768px:
   - scenes stack;
   - no pin or horizontal overflow;
   - no WebGL canvas mounts.
8. Emulate reduced motion at desktop width and confirm the same static stack.
