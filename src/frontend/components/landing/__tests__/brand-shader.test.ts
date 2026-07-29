import { describe, expect, it } from "vitest";

import { BRAND_SHADER_PRESETS } from "../brand-shader";

describe("BrandShader constellation preset", () => {
    it("uses one stronger but slow NeuroNoise treatment", () => {
        expect(BRAND_SHADER_PRESETS.constellation).toEqual({
            scale: 1.24,
            rotation: 0.72,
            speed: 0.16,
            opacity: "opacity-[0.28]",
        });
    });
});
