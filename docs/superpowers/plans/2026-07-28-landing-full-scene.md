# Landing Full-Scene Narrative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stacked `Cómo funciona` cards with a desktop pinned,
four-scene GSAP narrative while making a 3% square grid continuous across the
rest of the landing.

**Architecture:** `LandingStages` remains the section owner. It composes four
static screen visualizations inside a reusable `GsapPinnedScenes` motion
primitive. A pure progress helper keeps scene-boundary behavior testable. One
desktop-only `BrandShader` sits behind the pinned sequence; every other section
uses the root grid.

**Tech Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · GSAP
3.15 · `@gsap/react` · ScrollTrigger · Vitest

## Global Constraints

- Keep all landing code under `src/frontend/components/landing/`.
- Preserve 4-space indentation and Biome formatting.
- Do not add CSS custom properties.
- Use existing semantic color tokens only.
- Animate only `transform` and `autoAlpha`.
- Pin only at `min-width: 64rem` with motion enabled.
- Render a static stack below `64rem` and under reduced motion.
- Mount at most one WebGL canvas, only in the pinned desktop mode.
- Keep every production file below 500 lines.
- Put tests in a local `__tests__` directory.
- Delete no files.

---

### Task 1: Test and implement scene-boundary mapping

**Files:**

- Create: `src/frontend/components/landing/__tests__/scene-progress.test.ts`
- Create: `src/frontend/components/landing/scene-progress.ts`

**Interfaces:**

- Produces: `getActiveSceneIndex(progress: number, sceneCount: number): number`
- Consumed by: `GsapPinnedScenes` in Task 3

- [ ] **Step 1: Write the failing boundary test**

The mutation this catches: using `Math.round()` or failing to clamp progress
would select the wrong scene around quarter boundaries.

```ts
import { describe, expect, it } from "vitest";
import { getActiveSceneIndex } from "../scene-progress";

describe("getActiveSceneIndex", () => {
    it.each([
        [-0.2, 0],
        [0, 0],
        [0.249, 0],
        [0.25, 1],
        [0.5, 2],
        [0.749, 2],
        [0.75, 3],
        [1, 3],
        [1.4, 3],
    ])("maps progress %s to scene %s", (progress, expected) => {
        expect(getActiveSceneIndex(progress, 4)).toBe(expected);
    });

    it("returns the first scene when there is only one scene", () => {
        expect(getActiveSceneIndex(0.9, 1)).toBe(0);
    });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run src/frontend/components/landing/__tests__/scene-progress.test.ts
```

Expected: FAIL because `../scene-progress` does not exist.

- [ ] **Step 3: Implement the smallest passing helper**

```ts
export function getActiveSceneIndex(
    progress: number,
    sceneCount: number,
): number {
    if (sceneCount <= 1) return 0;

    const clampedProgress = Math.min(1, Math.max(0, progress));
    return Math.min(
        sceneCount - 1,
        Math.floor(clampedProgress * sceneCount),
    );
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the same focused command. Expected: 10 passing assertions.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/components/landing/scene-progress.ts \
  src/frontend/components/landing/__tests__/scene-progress.test.ts
git commit -m "test: define landing scene boundaries"
```

---

### Task 2: Build the four static product screens

**Files:**

- Create: `src/frontend/components/landing/stage-screens.tsx`

**Interfaces:**

- Produces: `StageScreen({ index }: { index: number }): React.ReactNode`
- Consumed by: each scene in `LandingStages`

- [ ] **Step 1: Create the stage-screen dispatcher**

Use one component boundary and four private presentational branches:

```tsx
import type { PropsWithChildren } from "react";
import { Label } from "./lumen";

export function StageScreen({ index }: { index: number }) {
    switch (index) {
        case 0:
            return <SourcesScreen />;
        case 1:
            return <GraphScreen />;
        case 2:
            return <AgentScreen />;
        default:
            return <FreshnessScreen />;
    }
}
```

- [ ] **Step 2: Implement exact visualization content**

Every branch calls this shared private frame:

```tsx
function StageFrame({ children }: PropsWithChildren) {
    return (
        <figure className="relative min-h-[20rem] overflow-hidden rounded-[var(--radius-card)] border border-border bg-card/90 p-[var(--space-lg)] shadow-[0_24px_70px_-32px_rgb(0_0_0/0.75)] lg:min-h-[28rem]">
            <div className="relative z-10">{children}</div>
        </figure>
    );
}
```

Branch requirements:

- `SourcesScreen(): React.ReactNode`: four labelled source rows (`Notion`, `Slack`,
  `Microsoft 365`, `Documentos`) converging on one `Continuum` node.
- `GraphScreen(): React.ReactNode`: SVG edges behind four semantic node chips (`Persona`,
  `Decisión`, `Documento`, `Criterio`) and one centered graph label.
- `AgentScreen(): React.ReactNode`: the existing Head of Sales question, answer, and two source
  citations. No fabricated metrics.
- `FreshnessScreen(): React.ReactNode`: three sync rows labelled `Slack`, `Notion`, and
  `Microsoft 365`, each ending in `Actualizado`, plus a final `Grafo al día`
  state.

Use only `bg-card`, `bg-secondary`, `text-foreground`,
`text-muted-foreground`, `border-border`, `bg-primary`,
`text-primary`, and `text-brand-chord`.

- [ ] **Step 3: Run touched-file formatting diagnostics**

```bash
pnpm biome check src/frontend/components/landing/stage-screens.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/components/landing/stage-screens.tsx
git commit -m "feat: add landing stage screens"
```

---

### Task 3: Add the pinned GSAP scene primitive

**Files:**

- Modify: `src/frontend/components/landing/motion.tsx`

**Interfaces:**

- Consumes: `getActiveSceneIndex()`
- Produces:

```ts
type GsapPinnedScenesProps = PropsWithChildren<{
    className?: string;
    onSceneChange: (index: number) => void;
}>;
```

- Scene elements opt in with `[data-full-scene]`.
- Progress fill opts in with `[data-scene-progress]`.

- [ ] **Step 1: Add `GsapPinnedScenes`**

```tsx
export function GsapPinnedScenes({
    className,
    onSceneChange,
    children,
}: GsapPinnedScenesProps) {
    const root = useRef<HTMLDivElement>(null);
    const activeScene = useRef(0);

    useGSAP(
        () => {
            const element = root.current;
            if (!element) return;

            const media = gsap.matchMedia();
            media.add(
                {
                    desktop: "(min-width: 64rem)",
                    reduceMotion: "(prefers-reduced-motion: reduce)",
                },
                (context) => {
                    const scenes = gsap.utils.toArray<HTMLElement>(
                        "[data-full-scene]",
                    );
                    const progress = element.querySelector<HTMLElement>(
                        "[data-scene-progress]",
                    );
                    const { desktop, reduceMotion } =
                        context.conditions ?? {};

                    if (!desktop || reduceMotion || scenes.length < 2) {
                        gsap.set(scenes, { clearProps: "all" });
                        if (progress) gsap.set(progress, { clearProps: "all" });
                        activeScene.current = 0;
                        onSceneChange(0);
                        return;
                    }

                    gsap.set(scenes, { autoAlpha: 0, yPercent: 4 });
                    gsap.set(scenes[0], { autoAlpha: 1, yPercent: 0 });
                    if (progress) {
                        gsap.set(progress, {
                            scaleX: 0,
                            transformOrigin: "left center",
                        });
                    }

                    const duration = scenes.length;
                    const timeline = gsap.timeline({
                        scrollTrigger: {
                            trigger: element,
                            start: "top top",
                            end: () =>
                                `+=${window.innerHeight * scenes.length}`,
                            pin: true,
                            scrub: 0.65,
                            invalidateOnRefresh: true,
                            onUpdate: (self) => {
                                const next = getActiveSceneIndex(
                                    self.progress,
                                    scenes.length,
                                );
                                if (next === activeScene.current) return;
                                activeScene.current = next;
                                onSceneChange(next);
                            },
                        },
                    });

                    if (progress) {
                        timeline.to(
                            progress,
                            { scaleX: 1, duration, ease: "none" },
                            0,
                        );
                    }

                    for (let index = 1; index < scenes.length; index += 1) {
                        timeline
                            .to(
                                scenes[index - 1],
                                {
                                    autoAlpha: 0,
                                    yPercent: -4,
                                    duration: 0.25,
                                    ease: "power1.inOut",
                                },
                                index,
                            )
                            .fromTo(
                                scenes[index],
                                { autoAlpha: 0, yPercent: 4 },
                                {
                                    autoAlpha: 1,
                                    yPercent: 0,
                                    duration: 0.25,
                                    ease: "power1.inOut",
                                    immediateRender: false,
                                },
                                "<",
                            );
                    }
                },
            );

            return () => media.revert();
        },
        { scope: root, dependencies: [onSceneChange] },
    );

    return (
        <div ref={root} className={className}>
            {children}
        </div>
    );
}
```

Import `getActiveSceneIndex` from `./scene-progress`. Keep registration at module
top. Do not put ScrollTrigger on child tweens.

- [ ] **Step 2: Run the focused unit test and typecheck**

```bash
pnpm vitest run src/frontend/components/landing/__tests__/scene-progress.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/components/landing/motion.tsx
git commit -m "feat: add pinned GSAP scene timeline"
```

---

### Task 4: Replace stage cards with the full-scene composition

**Files:**

- Modify: `src/frontend/components/landing/stages.tsx`
- Modify: `src/frontend/components/landing/brand-shader.tsx`

**Interfaces:**

- Consumes: `GsapPinnedScenes`, `StageScreen`, existing `Label`
- `BrandShader` gains `desktopMotionOnly?: boolean`

- [ ] **Step 1: Make `LandingStages` a client component**

Add `"use client"`, import `useState`, `BrandShader`,
`GsapPinnedScenes`, and `StageScreen`. Keep the existing four stage copy
objects, but remove the numbered-card rail and private `StageArt`.

- [ ] **Step 2: Compose full-screen scenes**

Use this DOM shape:

```tsx
const [activeScene, setActiveScene] = useState(0);

return (
    <section id="etapas" className="scroll-mt-24 border-border border-b">
        <GsapPinnedScenes
            onSceneChange={setActiveScene}
            className="relative overflow-clip lg:min-h-svh"
        >
            <BrandShader
                desktopMotionOnly
                variant="field"
                className="opacity-[0.2]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-background/45"
            />
            <div className="shell relative">
                <ol className="grid gap-[var(--space-lg)] py-[var(--space-2xl)] lg:min-h-svh lg:py-0">
                    {STAGES.map((stage, index) => (
                        <li
                            key={stage.n}
                            data-full-scene
                            className="full-scene-panel grid min-w-0 gap-[var(--space-xl)] lg:absolute lg:inset-0 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center"
                        >
                            <div className="min-w-0">
                                <Label
                                    className={
                                        stage.tone === "primary"
                                            ? "text-primary"
                                            : "text-brand-chord"
                                    }
                                >
                                    {stage.n}.0 · {stage.kicker} · {stage.when}
                                </Label>
                                <h2 className="mt-3 max-w-[16ch] font-display text-[length:var(--text-display-s)] leading-[1.05] tracking-[-0.025em]">
                                    {stage.title}
                                </h2>
                                <p className="mt-[var(--space-lg)] max-w-[52ch] text-muted-foreground leading-relaxed">
                                    {stage.body}
                                </p>
                            </div>
                            <StageScreen index={index} />
                        </li>
                    ))}
                </ol>
                {/* four stage markers + data-scene-progress fill */}
            </div>
        </GsapPinnedScenes>
    </section>
);
```

The progress UI stays at the bottom on desktop, is hidden below `64rem`, marks
`activeScene` with semantic token classes, and contains:

```tsx
<span
    data-scene-progress
    className="absolute inset-y-0 left-0 w-full bg-primary"
/>
```

- [ ] **Step 3: Gate the shader mount**

In `brand-shader.tsx`, extend the props:

```ts
desktopMotionOnly?: boolean;
```

Use one media-query hook for
`(min-width: 64rem) and (prefers-reduced-motion: no-preference)`. Return `null`
when `desktopMotionOnly` is true and the query does not match. Remove
`StageShader`, `DotGrid`, `Voronoi`, and `Warp`; the new full scene uses only one
`NeuroNoise` canvas.

- [ ] **Step 4: Run focused checks**

```bash
pnpm biome check \
  src/frontend/components/landing/stages.tsx \
  src/frontend/components/landing/brand-shader.tsx
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/components/landing/stages.tsx \
  src/frontend/components/landing/brand-shader.tsx
git commit -m "feat: turn landing stages into full-scene narrative"
```

---

### Task 5: Make the grid continuous and remove band shaders

**Files:**

- Modify: `src/frontend/components/landing/index.tsx`
- Modify: `src/frontend/components/landing/hero.tsx`
- Modify: `src/frontend/components/landing/continuity.tsx`
- Modify: `src/frontend/components/landing/demo/demo-section.tsx`
- Modify: `src/frontend/components/landing/comparison.tsx`
- Modify: `src/frontend/components/landing/cta.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

- `.lumen-grid` remains the only background utility.
- The landing root becomes its sole page-level owner.

- [ ] **Step 1: Move the grid to the landing root**

In `index.tsx`, change the root class to include `lumen-grid`.

In `globals.css`, change both grid line mixes from 4% to 3%. Add:

```css
@media (min-width: 64rem) and (prefers-reduced-motion: no-preference) {
    .full-scene-panel {
        min-height: 100svh;
        will-change: transform, opacity;
    }
}
```

- [ ] **Step 2: Remove duplicate backgrounds**

- `hero.tsx`: remove `BrandShader` import/render and section `lumen-grid`.
- `continuity.tsx`: remove `BrandShader` import/render.
- `demo/demo-section.tsx`: remove `BrandShader` import/render.
- `comparison.tsx`: remove the callout `BrandShader` import/render.
- `cta.tsx`: remove `BrandShader` import/render and section `lumen-grid`.

Keep existing translucent `bg-secondary/40` and `bg-card` surfaces.

- [ ] **Step 3: Run focused checks**

```bash
pnpm biome check \
  src/app/globals.css \
  src/frontend/components/landing/index.tsx \
  src/frontend/components/landing/hero.tsx \
  src/frontend/components/landing/continuity.tsx \
  src/frontend/components/landing/demo/demo-section.tsx \
  src/frontend/components/landing/comparison.tsx \
  src/frontend/components/landing/cta.tsx
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/frontend/components/landing
git commit -m "feat: unify landing background grid"
```

---

### Task 6: Verify, review, push, merge

**Files:**

- Review all files changed since `origin/main`

- [ ] **Step 1: Run full automated verification**

```bash
pnpm test
pnpm check
pnpm typecheck
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 2: Run browser verification**

At 1440px, scroll both directions through the pinned scene. Confirm all four
screens, matching markers, one WebGL canvas, and clean pin exit.

At 320px, 375px, 414px, and 768px, confirm static stack, no canvas, no overflow.

At 1440px with reduced motion, confirm static stack and no canvas.

- [ ] **Step 3: Run project code-review checklist**

Read all files under `docs/code-review/`, inspect the branch diff, and fix every
finding. Run Hallmark slop test after visual implementation and fix failures.

- [ ] **Step 4: Request code review and resolve findings**

Use `superpowers:requesting-code-review`. Re-run the four verification commands
after fixes.

- [ ] **Step 5: Push the feature branch**

```bash
git push
```

- [ ] **Step 6: Merge and push main**

Use `superpowers:finishing-a-development-branch`. The user selected merge:

```bash
git switch main
git merge --no-ff feat/landing-full-scene
git push origin main
```

Confirm remote `origin/main` contains the merge commit.
