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
- Added explicit mobile/reduced-motion branch that directly sets stable static state and skips animated timelines.

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

## fix round 1

### applied fixes
- Added desktop-inactive baseline application using `gsap.set` and `PHASE_STATES` so motion layers and phase-specific state are applied before returning from desktop motion mode.
- Kept `buildAmbientTimeline` creation inside `useGSAP` so selector scoping remains valid, and paused ambient timeline immediately until transition completion.
- Added transition-time ambient residue reset values (source marks, packets, graph camera/clusters, decision particle, integration signal/wave, phase-four defaults) to prevent stale transform carry-over.
- Added focused runtime tests for desktop inactive baseline (`active={false}`) and reduced-motion static fallback visibility.
- Included `activeStage` in visibility synchronization effect dependencies.

### verification round 1
- `pnpm test -- src/frontend/components/landing/__tests__/stage-screens.test.ts src/frontend/components/landing/__tests__/stage-screen-graph.test.ts src/frontend/components/landing/__tests__/landing-stages.test.ts`
  - Result: pass (`46 passed`, `309` tests)
- `pnpm exec biome check src/frontend/components/landing/stage-screens.tsx src/frontend/components/landing/stage-screen-graph.tsx src/frontend/components/landing/__tests__/stage-screens.test.ts`
  - Result: clean
- `pnpm typecheck`
  - Result: clean
- `git diff --check`
  - Result: clean

### commit
- 423febb


## fix round 2

### applied fixes
- Added `ambientReady` and `transitionComplete` refs, initialized to `false` on every stage/active rebuild and cleared on teardown.
- Added a pure visibility decision helper `shouldPauseAmbient` used by ambient synchronization.
- Changed visibility synchronization so ambient pauses when document is hidden, section inactive, transition is not complete, or ambient is not ready.
- Transition `onComplete` now marks ambient readiness and plays ambient only when conditions are clear (`document` visible and section active).
- Kept inactive/mobile/reduced-motion branches as pause-only paths: no ambient timelines are created and ambient readiness stays false.
- Added focused runtime coverage proving visibility toggling pauses ambient and transition while transition is incomplete via runtime spies and pure helper assertions.
- Replaced deprecated test import by using `act` and `createElement` from React.

### verification round 2
- `pnpm test -- src/frontend/components/landing/__tests__/stage-screens.test.ts src/frontend/components/landing/__tests__/stage-screen-graph.test.ts src/frontend/components/landing/__tests__/landing-stages.test.ts`
  - Result: pass (`46 passed`, `311` tests)
- `pnpm exec biome check src/frontend/components/landing/stage-screens.tsx src/frontend/components/landing/__tests__/stage-screens.test.ts`
  - Result: clean
- `pnpm typecheck`
  - Result: clean
- `git diff --check`
  - Result: clean

### commit
- c9630d9
