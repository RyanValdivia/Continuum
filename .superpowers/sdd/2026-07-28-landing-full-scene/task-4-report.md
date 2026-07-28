# Task 4 — Full-scene landing narrative

## Implementación inicial

- Reemplazadas tarjetas de etapas por composición de escenas full-screen con `GsapPinnedScenes` y `StageScreen`.
- Añadido marcador/progreso desktop y un único `BrandShader` NeuroNoise, sin montar WebGL en móvil ni reduced motion.
- Commit: `bdfaad0 feat: turn landing stages into full-scene narrative`.

## Ronda de corrección — accesibilidad

- GSAP aplica `autoAlpha: 0` a escenas visuales inactivas; esto también aplica `visibility: hidden` y las retira del árbol accesible.
- La composición visual completa está ahora en un contenedor `aria-hidden`, seguro porque no contiene controles interactivos.
- Añadida una lista `sr-only` semántica única, etiquetada `Todas las etapas`, con kicker, momento, título y cuerpo de las cuatro etapas. No existe contenido duplicado en el árbol accesible.
- Añadida prueba de render estático real que confirma el ocultamiento visual y las cuatro etapas completas en la representación accesible. No requiere mocks de GSAP ni WebGL.

## Verificación

- `pnpm test src/frontend/components/landing/__tests__/landing-stages.test.ts` — PASS.
- `pnpm biome check src/frontend/components/landing/stages.tsx src/frontend/components/landing/__tests__/landing-stages.test.ts` — PASS.
- `pnpm typecheck` — PASS.
- `git diff --check` — PASS.
