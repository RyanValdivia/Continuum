# Continuum — Landing Page Design

**Date:** 2026-07-18
**Status:** Approved

## Goal

Public marketing landing for Continuum — "la memoria viva de la empresa".
Elegant, minimalist, blue accent. Rendered at root `/`, built native to the
codebase (React + Tailwind v4 + shadcn/ui + `motion`). Not a Claude Artifact.

## Routing

`src/app/page.tsx` (server component):

1. `authenticate()`.
2. If session **and** the user has an organization → `redirect(\`/\${slug}/app/projects\`)` (keep current behavior).
3. Otherwise render `<Landing />` (logged-out visitors and org-less users see marketing, not a forced sign-in redirect).

CTAs (`Iniciar sesión`, `Empezar`) link to `/auth/sign-in`.

## Brand tokens (`src/app/globals.css`)

Owner-approved deviation from the "no palette colors / no new vars" rule:
introduce a **blue brand** by re-tinting existing tokens (no new custom
properties).

- `--primary`: grayscale → `oklch(0.55 0.17 256)` (light). Dark: a brighter blue, e.g. `oklch(0.62 0.17 256)`.
- `--primary-foreground`: stays near-white for contrast.
- `--ring`: retinted to the blue so focus rings match.
- Neutrals (`muted`, `secondary`, `border`, `card`) stay grayscale.
- Soft blue surfaces use the opacity form (`bg-primary/5`, `bg-primary/10`) — no hardcoded palette utilities.

Final blue shade tuned during build for contrast (WCAG AA on `--primary-foreground`).

## Typography

Load an elegant sans via `next/font` in `layout.tsx` (Geist Sans; Inter as
fallback if unavailable). Tight letter-spacing on large display headings is the
core of the "minimalist elegant" feel. Update global `metadata` (title +
description) to Continuum, in Spanish.

## Sections (Spanish copy, from brand README)

| # | Section | Content |
|---|---------|---------|
| 1 | Nav | Sticky, backdrop-blur. `Continuum` wordmark · in-page anchors · `Iniciar sesión`. |
| 2 | Hero | H1 "La memoria viva de la empresa" · sub "No es otro chatbot — una plataforma de continuidad del conocimiento" · tagline "Menos búsqueda, más continuidad." · CTAs `Empezar` (primary) + `Ver cómo funciona` (ghost). Faint blue radial glow + subtle knowledge-graph node motif background. |
| 3 | El problema | Lead "Cuando alguien clave se va, su conocimiento se va con esa persona." → 3 cards: **Lento** · **Costoso** · **Dependiente de otros**. |
| 4 | Cómo funciona | 3 pillars: **Grafo de conocimiento** · **Un agente por persona** · **Transferencia de conocimiento**. |
| 5 | Competencia | Minimal comparison table — Glean / Notion / Asana (qué les falta) vs **Continuum** (qué llena). |
| 6 | CTA band | Large "Menos búsqueda, más continuidad." + `Empezar` CTA on a soft blue-tinted band. |
| 7 | Footer | Minimal — wordmark, one-line pitch, links to `AGENTS.md` / repo. |

## Component structure

`src/frontend/components/landing/`:

- `nav.tsx`, `hero.tsx`, `problem.tsx`, `how-it-works.tsx`, `comparison.tsx`, `cta.tsx`, `footer.tsx` — one focused component per section.
- `index.tsx` — composes them into `<Landing />`.
- A small shared `reveal.tsx` client wrapper for scroll-in animation.

Each file small and single-purpose (< 500 lines per AGENTS.md).

## Motion

`motion` library. Subtle `whileInView` fade-up (opacity + small translateY),
staggered per section. Honors `prefers-reduced-motion` (no transform when
reduced). No parallax or heavy effects — minimalist.

## Non-goals (YAGNI)

- No bilingual toggle (Spanish only).
- No CMS / dynamic content — copy is static.
- No new backend routes or data fetching.
- No unit tests for pure presentational components; verify via build + browser.

## Verification

`pnpm check` · `pnpm typecheck` · `pnpm build`, then view at
`http://localhost:3000` (logged-out) to confirm layout, blue accent, dark mode,
and reduced-motion behavior.
