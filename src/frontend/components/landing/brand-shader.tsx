"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { cn } from "@/frontend/lib/utils";

/**
 * Paper Shaders is WebGL-only, so it loads client-side with SSR disabled to
 * avoid a `<canvas>` hydration mismatch.
 * Docs: https://shaders.paper.design/neuro-noise
 */
const NeuroNoise = dynamic(
    () => import("@paper-design/shaders-react").then((mod) => mod.NeuroNoise),
    { ssr: false },
);
const Voronoi = dynamic(
    () => import("@paper-design/shaders-react").then((mod) => mod.Voronoi),
    { ssr: false },
);
const Warp = dynamic(
    () => import("@paper-design/shaders-react").then((mod) => mod.Warp),
    { ssr: false },
);
const DotGrid = dynamic(
    () => import("@paper-design/shaders-react").then((mod) => mod.DotGrid),
    { ssr: false },
);

/**
 * The brand texture. NeuroNoise reads as a neural field, which is the right
 * metaphor for a product whose asset is a knowledge graph — Dithering was a
 * generic halftone and said nothing about Continuum.
 *
 * The shader takes literal colour strings (WebGL can't consume a `var()`), so
 * the brand azure is duplicated here as hex. Kept in one place on purpose.
 */
const AZURE = "#4a90f7";
const AZURE_DEEP = "#14315f";
const TRANSPARENT = "#00000000";

type Variant = "field" | "panel" | "band";

const VARIANTS: Record<
    Variant,
    { scale: number; rotation: number; speed: number; opacity: string }
> = {
    /** Wide, slow, barely-there — sits under a whole section. */
    field: {
        scale: 1.1,
        rotation: 0.4,
        speed: 0.12,
        opacity: "opacity-[0.16]",
    },
    /** Inside a card, behind content. Tighter and a touch brighter. */
    panel: { scale: 0.8, rotation: 1.2, speed: 0.18, opacity: "opacity-[0.2]" },
    /** Full-bleed band: broad and quiet so type stays readable on top. */
    band: { scale: 1.5, rotation: 2.1, speed: 0.1, opacity: "opacity-[0.13]" },
};

export function BrandShader({
    variant = "field",
    className,
}: {
    variant?: Variant;
    className?: string;
}) {
    const reduce = useReducedMotion();
    const preset = VARIANTS[variant];

    return (
        <Suspense fallback={null}>
            <div
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 z-0",
                    preset.opacity,
                    className,
                )}
            >
                <NeuroNoise
                    colorBack={TRANSPARENT}
                    colorMid={AZURE_DEEP}
                    colorFront={AZURE}
                    brightness={1.1}
                    contrast={0.72}
                    scale={preset.scale}
                    rotation={preset.rotation}
                    speed={reduce ? 0 : preset.speed}
                    minPixelRatio={1}
                    className="size-full"
                />
            </div>
        </Suspense>
    );
}

/**
 * One shader per stage, chosen so the texture says something about the step it
 * sits behind — a grid snapping into place for "connect", cells partitioning
 * for "map", a neural field for "ask", a flowing warp for "keep current".
 * Four different shaders, not one recoloured four times.
 */
/**
 * The stage panels are `hidden md:grid`, but `display: none` does not stop
 * React mounting them — each one still spun up a WebGL context on phones.
 * Gate the mount on the same breakpoint the CSS uses.
 */
function useAboveMd() {
    const [above, setAbove] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 48rem)");
        const sync = () => setAbove(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);
    return above;
}

export function StageShader({ index }: { index: number }) {
    const reduce = useReducedMotion();
    const aboveMd = useAboveMd();
    // All four run on the azure. Coral is the verb landmark, not a surface —
    // and blended across a panel it turns to rust on this canvas. The variety
    // lives in *which shader* each stage gets, not in the hue.
    const front = AZURE;
    const back = AZURE_DEEP;
    // Voronoi and Warp fill the whole panel; DotGrid and NeuroNoise are airy.
    // Same visual weight needs different alpha.
    const dense = index === 1 || index === 3;

    if (!aboveMd) return null;

    const shader = (() => {
        switch (index) {
            case 0:
                return (
                    <DotGrid
                        colorBack={TRANSPARENT}
                        colorFill={front}
                        colorStroke={back}
                        size={2.4}
                        gapX={22}
                        gapY={22}
                        strokeWidth={0.6}
                        sizeRange={0.6}
                        opacityRange={0.7}
                        className="size-full"
                        minPixelRatio={1}
                    />
                );
            case 1:
                return (
                    <Voronoi
                        colors={[front, back]}
                        colorGap={TRANSPARENT}
                        colorGlow={front}
                        stepsPerColor={2}
                        distortion={0.32}
                        gap={0.06}
                        glow={0.4}
                        speed={reduce ? 0 : 0.16}
                        scale={0.85}
                        className="size-full"
                        minPixelRatio={1}
                    />
                );
            case 2:
                return (
                    <NeuroNoise
                        colorBack={TRANSPARENT}
                        colorMid={back}
                        colorFront={front}
                        brightness={1.15}
                        contrast={0.8}
                        scale={0.7}
                        speed={reduce ? 0 : 0.2}
                        className="size-full"
                        minPixelRatio={1}
                    />
                );
            default:
                return (
                    <Warp
                        colors={[back, front]}
                        proportion={0.45}
                        softness={0.9}
                        distortion={0.2}
                        swirl={0.6}
                        swirlIterations={8}
                        scale={0.9}
                        speed={reduce ? 0 : 0.14}
                        className="size-full"
                        minPixelRatio={1}
                    />
                );
        }
    })();

    return (
        <Suspense fallback={null}>
            <div
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 z-0",
                    dense ? "opacity-[0.4]" : "opacity-[0.6]",
                )}
            >
                {shader}
            </div>
        </Suspense>
    );
}
