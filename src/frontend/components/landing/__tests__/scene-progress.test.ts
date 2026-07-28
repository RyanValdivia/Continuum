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
