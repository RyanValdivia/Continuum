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

const AZURE = "#4a90f7";
const AZURE_DEEP = "#14315f";
const TRANSPARENT = "#00000000";

type Variant = "field" | "panel" | "band";

const VARIANTS: Record<
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
};

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
    desktopMotionOnly = false,
}: {
    variant?: Variant;
    className?: string;
    desktopMotionOnly?: boolean;
}) {
    const reduce = useReducedMotion();
    const desktopMotion = useDesktopMotion();
    const preset = VARIANTS[variant];

    if (desktopMotionOnly && !desktopMotion) return null;

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
