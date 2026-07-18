"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { Suspense } from "react";

/**
 * Paper Shaders dithering is WebGL-only, so it loads client-side with SSR
 * disabled to avoid a `<canvas>` hydration mismatch.
 */
const Dithering = dynamic(
    () => import("@paper-design/shaders-react").then((mod) => mod.Dithering),
    { ssr: false },
);

/** Brand azure — the shader takes a concrete hex, not a CSS variable. */
const SHADER_COLOR = "#0088f7";

export function ShaderBackdrop() {
    const reduce = useReducedMotion();
    return (
        <Suspense fallback={null}>
            <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.22] dark:opacity-[0.28] dark:mix-blend-screen">
                <Dithering
                    colorBack="#00000000"
                    colorFront={SHADER_COLOR}
                    shape="warp"
                    type="4x4"
                    speed={reduce ? 0 : 0.1}
                    className="size-full"
                    minPixelRatio={1}
                />
            </div>
        </Suspense>
    );
}
