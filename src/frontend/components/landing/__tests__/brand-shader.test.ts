import { describe, expect, it } from "vitest";

import { BRAND_SHADER_PRESETS, constellationPhase } from "../brand-shader";

const STAGES = [0, 1, 2, 3] as const;

describe("BrandShader constellation preset", () => {
    it("uses one stronger but slow NeuroNoise treatment", () => {
        expect(BRAND_SHADER_PRESETS.constellation).toEqual({
            scale: 1.24,
            rotation: 0.72,
            speed: 0.16,
            opacity: "opacity-[0.28]",
        });
    });

    // The tween writes an inline opacity that outranks the preset's utility
    // class, so no stage may resolve above the preset's own resting alpha.
    it("keeps every animated stage within the preset's resting alpha", () => {
        for (const stage of STAGES) {
            expect(constellationPhase(stage).autoAlpha).toBeLessThanOrEqual(
                0.28,
            );
            expect(constellationPhase(stage).autoAlpha).toBeGreaterThan(0.2);
        }
    });

    it("peaks on the decision stage and eases back for the last one", () => {
        expect(constellationPhase(2).autoAlpha).toBe(0.28);
        expect(constellationPhase(3).autoAlpha).toBeLessThan(
            constellationPhase(2).autoAlpha,
        );
        expect(constellationPhase(0).autoAlpha).toBeLessThan(
            constellationPhase(1).autoAlpha,
        );
    });
});
