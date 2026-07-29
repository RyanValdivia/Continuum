# Task 5 Report (Landing Constellation Narrative)

## status
- DONE

## files
- `src/frontend/components/landing/stage-screens.tsx`
- `src/frontend/components/landing/stage-screen-graph.tsx`
- `src/frontend/components/landing/__tests__/stage-screens.test.ts`
- `.superpowers/sdd/2026-07-28-landing-constellation-narrative/task-5-report.md`

## commits
- feat: animate constellation narrative (co-authored by Claude)

## RED/GREEN evidence
### RED
- `pnpm test -- src/frontend/components/landing/__tests__/stage-screens.test.ts src/frontend/components/landing/__tests__/stage-screen-graph.test.ts src/frontend/components/landing/__tests__/landing-stages.test.ts`
  - Initial run failed due a local implementation issue (`ReferenceError: scope is not defined`) during `StageScreen` render in tests.

### GREEN
- `pnpm test -- src/frontend/components/landing/__tests__/stage-screens.test.ts src/frontend/components/landing/__tests__/stage-screen-graph.test.ts src/frontend/components/landing/__tests__/landing-stages.test.ts`
  - Result: `46 passed` (`307` tests)
- Added and validated new choreography-target assertions in `stage-screens.test.ts`.

## commands/outcomes
- `pnpm test -- src/frontend/components/landing/__tests__/stage-screens.test.ts src/frontend/components/landing/__tests__/stage-screen-graph.test.ts src/frontend/components/landing/__tests__/landing-stages.test.ts`
  - First run: failed (`scope` ref error).
  - Second run: pass (`46 passed`, `307` tests).
- `pnpm exec biome check src/frontend/components/landing/stage-screens.tsx src/frontend/components/landing/stage-screen-graph.tsx src/frontend/components/landing/__tests__/stage-screens.test.ts`
  - Clean.
- `pnpm typecheck`
  - Clean.
- `git diff --check`
  - Clean.

## cleanup reasoning
- Kept motion state in `useRef` timelines (`transition`, `ambient`) and killed both before creating replacements to avoid additive animations.
- Added `visibilitychange` + active-state pause logic so timelines pause when tab is hidden or `active === false`.
- Added explicit unmount cleanup to kill active timelines.
- Added dedicated mobile/reduced-motion branch that directly sets stable static state and skips animated timelines.

## self-review
- Added phase-state contract helpers (`PHASE_STATES`) plus `buildPhaseTransition` and `buildAmbientTimeline` per stage.
- Implemented stage-specific ambient behavior, including:
  - Stage 0 source packet emission (`data-context-packet`),
  - Stage 1 graph camera/cluster motion,
  - Stage 2 decision-route particle flow using `DECISION_ROUTE_NODE_IDS` + `LANDING_GRAPH_NODES`,
  - Stage 3 integration signal and phase-four node/edge sequencing.
- Wired scoped `useGSAP` with `revertOnUpdate: false` and transition/ambient lifecycle using refs.
- Updated `stage-screen-graph` selectors to emit exact `"true"` string contract for all targeted flags (`data-decision-route`, `data-phase-four-node`, `data-phase-four-edge`).
- Expanded `stage-screens` static contract assertions to include all required motion targets and markers.

## concerns
- `routeNodes[0]` fallback in stage-2 ambient code remains defensive and returns the timeline if unexpectedly missing; it is unreachable with current data set.
- Added scope to `useGSAP` required for this implementation changed from initial draft; no functional concerns after validation.
