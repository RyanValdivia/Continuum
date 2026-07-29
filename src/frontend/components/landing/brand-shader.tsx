"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
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

/**
 * Shared by the shader and the scrim over it, so the two fade as one layer
 * instead of one of them outlining the other.
 */
export const SCENE_EDGE_FADE =
    "[mask-image:linear-gradient(to_bottom,transparent,black_16%,black_90%,transparent)]";

const AZURE = "#4a90f7";
const AZURE_DEEP = "#14315f";
const TRANSPARENT = "#00000000";

type Variant = "field" | "panel" | "band" | "constellation";

export const BRAND_SHADER_PRESETS: Record<
    Variant,
    { scale: number; rotation: number; speed: number; opacity: string }
> = {
    field: {
        scale: 1.1,
        rotation: 0.4,
        speed: 0.12,
        opacity: "opacity-[0.16]",
    },
    panel: { scale: 0.8, rotation: 1.2, speed: 0.18, opacity: "opacity-[0.2]" },
    band: { scale: 1.5, rotation: 2.1, speed: 0.1, opacity: "opacity-[0.13]" },
    constellation: {
        scale: 1.24,
        rotation: 0.72,
        speed: 0.16,
        opacity: "opacity-[0.28]",
    },
};

/**
 * The constellation preset's resting alpha, mirrored by its `opacity` class so
 * the first paint matches what GSAP animates to.
 */
const CONSTELLATION_BASE_ALPHA = 0.28;

/**
 * Per-stage intensity as a fraction of the base alpha. GSAP writes an inline
 * `opacity`, which outranks the Tailwind opacity utility — so these ratios have
 * to be resolved against the base before they reach a tween, or stage one alone
 * would render the shader at 0.78 instead of 0.22.
 */
const SHADER_PHASE_INTENSITIES = [0.78, 0.92, 1, 0.88] as const;
const SHADER_PHASE_SCALES = [1, 1.025, 1.045, 1.02] as const;

export function constellationPhase(stage: 0 | 1 | 2 | 3): {
    autoAlpha: number;
    scale: number;
} {
    return {
        autoAlpha: CONSTELLATION_BASE_ALPHA * SHADER_PHASE_INTENSITIES[stage],
        scale: SHADER_PHASE_SCALES[stage],
    };
}

function useDesktopMotion() {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const query = window.matchMedia(
            "(min-width: 64rem) and (prefers-reduced-motion: no-preference)",
        );
        const sync = () => setMatches(query.matches);

        sync();
        query.addEventListener("change", sync);
        return () => query.removeEventListener("change", sync);
    }, []);

    return matches;
}

export function BrandShader({
    variant = "field",
    className,
    activeStage = 0,
    desktopMotionOnly = false,
}: {
    variant?: Variant;
    activeStage?: 0 | 1 | 2 | 3;
    className?: string;
    desktopMotionOnly?: boolean;
}) {
    const reduce = useReducedMotion();
    const desktopMotion = useDesktopMotion();
    const preset = BRAND_SHADER_PRESETS[variant];
    const scope = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            if (variant !== "constellation" || reduce || !desktopMotion) return;

            const target = scope.current;
            if (!target) return;

            gsap.to(target, {
                ...constellationPhase(activeStage),
                duration: 0.65,
                ease: "power2.inOut",
                overwrite: "auto",
            });
        },
        { scope, dependencies: [activeStage, desktopMotion, reduce, variant] },
    );

    if (desktopMotionOnly && !desktopMotion) return null;

    return (
        <Suspense fallback={null}>
            <div
                ref={scope}
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 z-0",
                    preset.opacity,
                    // The scene block starts mid-section, so an unmasked
                    // shader draws a hard horizontal edge right under the
                    // section head. Fading it in and out turns that edge into
                    // an approach.
                    variant === "constellation" && SCENE_EDGE_FADE,
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
