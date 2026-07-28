# Task 3 — Pinned GSAP scene primitive

## Implementación inicial

- Añadido `GsapPinnedScenes` en `src/frontend/components/landing/motion.tsx`.
- Usa `useGSAP`, `gsap.matchMedia`, y un único `ScrollTrigger` en timeline padre.
- Pin solo en desktop (`min-width: 64rem`) sin reduced motion; fallback restablece props y publica escena `0`.
- Escenas `[data-full-scene]`, progreso `[data-scene-progress]`, y cambios de escena mediante `getActiveSceneIndex()`.
- Commit: `143d22a feat: add pinned GSAP scene timeline`.

## Ronda de corrección

- Añadida condición `all: "all"` al `matchMedia`, para que callback se ejecute también en móvil normal y al cambiar desktop a móvil.
- `onSceneChange` ahora vive en `onSceneChangeRef`, actualizado con `useLayoutEffect`; GSAP usa `.current` y ya no se recrea por callbacks inline.
- No se añadió test de integración: no existe harness de GSAP/`matchMedia`; simular timelines y `ScrollTrigger` sería un mock frágil. Se conserva prueba focal del helper puro.

## Verificación

- `pnpm vitest run src/frontend/components/landing/__tests__/scene-progress.test.ts` — PASS (10 tests).
- `pnpm exec biome check src/frontend/components/landing/motion.tsx` — PASS.
- `pnpm typecheck` — PASS.
- `git diff --check` — PASS.
