# Continuum — Landing Background Continuity

**Date:** 2026-07-28
**Status:** Approved

## Goal

Remove full-section WebGL shaders from the landing. Replace their irregular,
high-contrast blobs with one subtle square grid that continues through the
entire marketing page.

The result should feel technical and atmospheric without competing with the
copy, cards, or live graph.

## Visual system

- Apply the existing 48px `.lumen-grid` pattern once at the landing root.
- Render the grid at 3% foreground contrast.
- Do not restart the grid per section; a single background coordinate system
  prevents visible seams.
- Preserve section borders, spacing, dark canvas, typography, palette, and
  card surfaces.
- Allow the translucent `Qué guarda` band to tint the grid without hiding it.

## Shader scope

Remove `BrandShader` backgrounds from:

- Hero
- `Qué guarda`
- `El grafo`
- Comparison callout
- Final CTA

Keep `StageShader` inside the four `Cómo funciona` illustration panels. These
are bounded content illustrations, not page backgrounds.

## Component changes

- `landing/index.tsx` owns the page-wide grid.
- Section components stop mounting `BrandShader` and remain transparent or use
  their existing translucent semantic surface.
- `brand-shader.tsx` retains only the stage illustration implementation; dead
  full-section shader variants are removed.
- `globals.css` keeps `.lumen-grid` as the single background utility and lowers
  its line contrast from 4% to 3%.

No route, copy, graph logic, CTA behavior, data flow, or animation timing
changes.

## Responsive and accessibility behavior

- The CSS grid is static and requires no JavaScript.
- No new motion is introduced.
- Reduced-motion behavior for retained stage shaders remains unchanged.
- The background must not reduce text or focus-ring contrast.
- The existing `overflow-x: clip` and responsive section layouts remain
  unchanged.

## Expected files

Modify:

- `src/frontend/components/landing/index.tsx`
- `src/frontend/components/landing/hero.tsx`
- `src/frontend/components/landing/continuity.tsx`
- `src/frontend/components/landing/demo/demo-section.tsx`
- `src/frontend/components/landing/comparison.tsx`
- `src/frontend/components/landing/cta.tsx`
- `src/frontend/components/landing/brand-shader.tsx`
- `src/app/globals.css`

Create no production files. Delete no files.

## Verification

1. Run focused diagnostics for touched files.
2. Run `pnpm check`.
3. Run `pnpm typecheck`.
4. Run `pnpm build`.
5. Review the full landing at 1440px and the required mobile widths.
6. Confirm the grid remains continuous through `Cómo funciona`, `Qué guarda`,
   `El grafo`, sources, comparison, CTA, and footer.
7. Confirm no full-section WebGL canvas remains and the four stage illustration
   canvases still render on desktop.
