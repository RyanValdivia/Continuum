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

const SHADER_PHASES = [
    { autoAlpha: 0.78, scale: 1 },
    { autoAlpha: 0.92, scale: 1.025 },
    { autoAlpha: 1, scale: 1.045 },
    { autoAlpha: 0.88, scale: 1.02 },
] as const;

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
                ...SHADER_PHASES[activeStage],
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
