# Landing Stage Card Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. The user explicitly requested direct
> execution on `main` without subagents.

**Goal:** Animate the four existing landing stage cards with scoped, active-only
GSAP loops while tightening the empty desktop handoff into the pinned narrative.

**Architecture:** `LandingStages` remains the scene owner and passes its active
index into `StageScreen`. Each `StageFrame` owns one scoped `useGSAP` timeline
selected by stage kind; desktop runs only the active loop, while mobile and
reduced-motion render the complete static state.

**Tech Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · GSAP
3.15 · `@gsap/react` · Vitest

## Global Constraints

- Work directly on `main`; explicit user approval was given.
- Do not dispatch subagents.
- Keep all production changes under `src/frontend/components/landing/`.
- Do not add dependencies, routes, CSS custom properties, React `style` props,
  or authored inline CSS. GSAP runtime transforms remain expected.
- Use existing semantic Tailwind tokens only.
- Animate only `x`, `y`, `scale`, `scaleX`, and `autoAlpha`.
- Scope every selector through `useGSAP` and a card ref.
- Run only the active desktop card timeline.
- Render complete static cards below `64rem` and under reduced motion.
- Keep existing copy, order, shader, pinned-scene behavior, semantic DOM, and
  accessibility summaries.
- Preserve 4-space indentation and keep every production file below 500 lines.

---

### Task 1: Define and implement the card motion contract

**Files:**

- Modify:
  `src/frontend/components/landing/__tests__/stage-screens.test.ts`
- Modify: `src/frontend/components/landing/stage-screens.tsx`

**Interfaces:**

- Produces:
  `StageScreen({ index, active }: { index: number; active: boolean })`
- Produces four stage kinds: `sources`, `graph`, `agent`, `freshness`.
- Each rendered `<figure>` exposes `data-stage-motion="<kind>"` and
  `data-stage-active="<true|false>"`.
- Each animated child exposes a stage-local `data-stage-item` value consumed
  only inside its scoped card timeline.

- [ ] **Step 1: Write the failing stage motion contract test**

Before writing it, name the break: removing or renaming one hook disconnects
real card content from its GSAP timeline.

Extend `stage-screens.test.ts` with a literal contract:

```ts
const MOTION_CONTRACT = [
    {
        index: 0,
        kind: "sources",
        items: { source: 4, connector: 4, core: 1 },
    },
    {
        index: 1,
        kind: "graph",
        items: { node: 4, edge: 1, core: 1 },
    },
    {
        index: 2,
        kind: "agent",
        items: { question: 1, answer: 1, source: 2 },
    },
    {
        index: 3,
        kind: "freshness",
        items: { source: 3, status: 3, core: 1 },
    },
] as const;

function countAttribute(markup: string, attribute: string): number {
    return markup.match(new RegExp(attribute, "g"))?.length ?? 0;
}

it.each(MOTION_CONTRACT)(
    "renders scoped motion targets for $kind",
    ({ index, kind, items }) => {
        const screen = renderToStaticMarkup(
            createElement(StageScreen, { index, active: true }),
        );

        expect(screen).toContain(`data-stage-motion="${kind}"`);
        expect(screen).toContain('data-stage-active="true"');

        for (const [item, count] of Object.entries(items)) {
            expect(
                countAttribute(screen, `data-stage-item="${item}"`),
            ).toBe(count);
        }
    },
);
```

Update the existing accessibility render call to pass `active: true`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run src/frontend/components/landing/__tests__/stage-screens.test.ts
```

Expected: FAIL because the figures do not expose stage motion hooks and
`StageScreen` does not accept `active`.

- [ ] **Step 3: Add scoped GSAP stage timelines**

Add `"use client"`, `useGSAP`, `gsap`, and `useRef` to
`stage-screens.tsx`. Register `useGSAP` once at module scope.

Use these private types:

```ts
type StageMotionKind = "sources" | "graph" | "agent" | "freshness";

type StageScreenProps = {
    index: number;
    active: boolean;
};

type StageFrameProps = PropsWithChildren<{
    active: boolean;
    caption: ReactNode;
    motion: StageMotionKind;
}>;
```

`StageFrame` owns a `figure` ref and calls:

```ts
useStageCardMotion(scope, motion, active);
```

The hook uses:

```ts
useGSAP(
    () => {
        const media = gsap.matchMedia();

        media.add(
            {
                desktop: "(min-width: 64rem)",
                reduceMotion: "(prefers-reduced-motion: reduce)",
            },
            (context) => {
                const { desktop, reduceMotion } = context.conditions ?? {};

                if (!desktop || reduceMotion) return;

                const timeline = buildStageTimeline(motion, active);
                return () => timeline.kill();
            },
        );

        return () => media.revert();
    },
    {
        scope,
        dependencies: [active, motion],
        revertOnUpdate: true,
    },
);
```

`buildStageTimeline()` creates one paused-or-playing timeline. Implement the
exact choreography below:

```ts
const item = (name: string) => `[data-stage-item="${name}"]`;

function buildStageTimeline(
    motion: StageMotionKind,
    active: boolean,
): gsap.core.Timeline {
    const timeline = gsap.timeline({
        paused: !active,
        repeat: -1,
        repeatDelay: 1,
        defaults: { ease: "power2.inOut" },
    });

    if (motion === "sources") {
        return timeline
            .set(item("source"), { autoAlpha: 0, y: 12 })
            .set(item("connector"), {
                scaleX: 0,
                transformOrigin: "left center",
            })
            .set(item("core"), { autoAlpha: 0, scale: 0.94 })
            .to(item("source"), {
                autoAlpha: 1,
                y: 0,
                duration: 0.34,
                stagger: 0.1,
            })
            .to(
                item("connector"),
                { scaleX: 1, duration: 0.3, stagger: 0.1 },
                "<0.08",
            )
            .to(
                item("core"),
                { autoAlpha: 1, scale: 1, duration: 0.32 },
                ">-0.06",
            )
            .to(item("core"), { scale: 1.035, duration: 0.16 })
            .to(item("core"), { scale: 1, duration: 0.2 })
            .to({}, { duration: 0.8 });
    }

    if (motion === "graph") {
        return timeline
            .set(item("node"), { autoAlpha: 0, scale: 0.9 })
            .set(item("edge"), { autoAlpha: 0 })
            .set(item("core"), { autoAlpha: 0, scale: 0.94 })
            .to(item("node"), {
                autoAlpha: 1,
                scale: 1,
                duration: 0.34,
                stagger: 0.1,
            })
            .to(item("edge"), { autoAlpha: 1, duration: 0.36 }, "<0.12")
            .to(
                item("core"),
                { autoAlpha: 1, scale: 1, duration: 0.32 },
                ">-0.08",
            )
            .to(item("core"), { scale: 1.035, duration: 0.16 })
            .to(item("core"), { scale: 1, duration: 0.2 })
            .to({}, { duration: 0.8 });
    }

    if (motion === "agent") {
        return timeline
            .set(item("question"), { autoAlpha: 0, y: 12 })
            .set(item("answer"), { autoAlpha: 0, y: 12 })
            .set(item("source"), { autoAlpha: 0, y: 8 })
            .to(item("question"), {
                autoAlpha: 1,
                y: 0,
                duration: 0.38,
            })
            .to(
                item("answer"),
                { autoAlpha: 1, y: 0, duration: 0.38 },
                ">-0.06",
            )
            .to(
                item("source"),
                { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.1 },
                ">-0.04",
            )
            .to({}, { duration: 0.8 });
    }

    return timeline
        .set(item("source"), { autoAlpha: 0, y: 10 })
        .set(item("status"), { autoAlpha: 0, scale: 0.92 })
        .set(item("core"), { autoAlpha: 0, y: 8 })
        .to(item("source"), {
            autoAlpha: 1,
            y: 0,
            duration: 0.32,
            stagger: 0.1,
        })
        .to(
            item("status"),
            { autoAlpha: 1, scale: 1, duration: 0.26, stagger: 0.1 },
            "<0.12",
        )
        .to(
            item("core"),
            { autoAlpha: 1, y: 0, duration: 0.34 },
            ">-0.02",
        )
        .to({}, { duration: 0.8 });
}
```

Use selector strings only inside the scoped `useGSAP` context. Add
`will-change-transform` only to elements that actually animate.

- [ ] **Step 4: Add exact stage-local hooks**

Add these attributes to existing semantic elements:

```text
sources:
  source ×4 · connector ×4 · core ×1
graph:
  node ×4 · edge ×1 on the SVG · core ×1
agent:
  question ×1 · answer ×1 · source ×2
freshness:
  source ×3 · status ×3 · core ×1
```

Pass `active` and the corresponding motion kind from each private screen into
`StageFrame`. Preserve all existing text and roles.

- [ ] **Step 5: Run focused test and verify GREEN**

Run:

```bash
pnpm vitest run src/frontend/components/landing/__tests__/stage-screens.test.ts
```

Expected: all `StageScreen` tests pass.

- [ ] **Step 6: Run touched-file diagnostics**

Run:

```bash
pnpm biome check \
  src/frontend/components/landing/stage-screens.tsx \
  src/frontend/components/landing/__tests__/stage-screens.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit task**

```bash
git add \
  src/frontend/components/landing/stage-screens.tsx \
  src/frontend/components/landing/__tests__/stage-screens.test.ts
git commit -m "feat: animate landing stage cards"
```

---

### Task 2: Wire active-scene ownership and tighten desktop rhythm

**Files:**

- Modify:
  `src/frontend/components/landing/__tests__/landing-stages.test.ts`
- Modify: `src/frontend/components/landing/stages.tsx`

**Interfaces:**

- Consumes:
  `StageScreen({ index, active }: { index: number; active: boolean })`
- `active` is true only when `index === activeScene`.
- Initial server markup exposes one active card and three inactive cards.

- [ ] **Step 1: Write the failing active-scene test**

Before writing it, name the break: failing to pass active ownership causes
hidden loops to run or omits the active loop.

Add these assertions to the existing `LandingStages` test:

```ts
expect(screen.match(/data-stage-active="true"/g)).toHaveLength(1);
expect(screen.match(/data-stage-active="false"/g)).toHaveLength(3);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run src/frontend/components/landing/__tests__/landing-stages.test.ts
```

Expected: FAIL because `LandingStages` does not pass active state to its four
cards.

- [ ] **Step 3: Wire active scene into each card**

Replace:

```tsx
<StageScreen index={index} />
```

with:

```tsx
<StageScreen index={index} active={activeScene === index} />
```

- [ ] **Step 4: Tighten desktop panel alignment**

In the stage `<li>`, replace vertical centering:

```text
lg:items-center
```

with top-weighted desktop spacing using existing tokens:

```text
lg:items-start lg:pt-[var(--space-2xl)] lg:pb-[var(--space-3xl)]
```

Do not change mobile classes, shader placement, progress placement, or pinned
scene timing.

- [ ] **Step 5: Run focused landing tests and verify GREEN**

Run:

```bash
pnpm vitest run \
  src/frontend/components/landing/__tests__/stage-screens.test.ts \
  src/frontend/components/landing/__tests__/landing-stages.test.ts \
  src/frontend/components/landing/__tests__/scene-progress.test.ts
```

Expected: all focused landing tests pass.

- [ ] **Step 6: Run touched-file diagnostics**

Run:

```bash
pnpm biome check \
  src/frontend/components/landing/stages.tsx \
  src/frontend/components/landing/__tests__/landing-stages.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit task**

```bash
git add \
  src/frontend/components/landing/stages.tsx \
  src/frontend/components/landing/__tests__/landing-stages.test.ts
git commit -m "fix: tighten landing stage narrative"
```

---

### Task 3: Project review and release verification

**Files:**

- Review all files changed since the design commit.
- Do not create or modify production files unless review finds a real issue.

**Interfaces:**

- Consumes project review rules in `docs/code-review/`.
- Produces fresh evidence for tests, formatting, types, build, browser layout,
  console state, mobile widths, and reduced motion.

- [ ] **Step 1: Read project review conventions**

Read in full:

```text
docs/code-review/README.md
docs/code-review/types-schemas.md
docs/code-review/frontend-data-fetching.md
docs/code-review/tables-and-forms.md
```

- [ ] **Step 2: Review diff against spec and conventions**

Run:

```bash
git diff 1797caa..HEAD -- \
  src/frontend/components/landing \
  docs/superpowers/plans/2026-07-28-landing-stage-card-motion.md
git diff --check 1797caa..HEAD
```

Check: no inline styles, no new tokens, no unscoped GSAP selectors, no
inactive desktop loops, no copy drift, no unrelated refactor.

- [ ] **Step 3: Run full automated verification**

Run each command separately and require exit code 0:

```bash
pnpm test
pnpm check
pnpm typecheck
pnpm build
```

- [ ] **Step 4: Review browser behavior**

At `http://localhost:3000/#etapas`, verify:

- desktop 1440 × 900: first card sits near viewport top, visible card loops,
  scene changes preserve the correct loop, shader stays behind content;
- 320, 375, 414, and 768 px: cards stack, stay readable, and do not overflow;
- desktop reduced motion: complete static end state, no looping;
- browser console: no new warnings or errors.

- [ ] **Step 5: Run Hallmark handoff checks**

Load `hallmark/references/slop-test.md` and
`hallmark/references/contract.md`. Apply only relevant single-section,
motion, mobile, accessibility, typography, and token gates.

- [ ] **Step 6: Commit review fixes if needed**

If review requires changes, use a focused commit:

```bash
git add \
  src/frontend/components/landing/stage-screens.tsx \
  src/frontend/components/landing/stages.tsx \
  src/frontend/components/landing/__tests__/stage-screens.test.ts \
  src/frontend/components/landing/__tests__/landing-stages.test.ts
git commit -m "fix: address landing motion review"
```

If no changes are needed, do not create an empty commit.
