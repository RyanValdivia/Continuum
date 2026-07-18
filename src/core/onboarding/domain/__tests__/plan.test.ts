import { describe, expect, it } from "vitest";
import { computeProgress, materializePlan, toggleCompleted } from "../plan";
import type { OnboardingDay, OnboardingPlanOutput } from "../types";

const output: OnboardingPlanOutput = {
    days: [
        {
            title: "Día 1",
            tasks: [
                { type: "read", title: "A", detail: "a", competency: "x" },
                { type: "talk", title: "B", detail: "b", competency: "y" },
            ],
        },
        {
            title: "Día 2",
            tasks: [{ type: "do", title: "C", detail: "c", competency: "z" }],
        },
    ],
};

describe("materializePlan", () => {
    it("assigns stable per-position ids d{day}t{task}", () => {
        const days = materializePlan(output);
        expect(days[0].tasks[0].id).toBe("d0t0");
        expect(days[0].tasks[1].id).toBe("d0t1");
        expect(days[1].tasks[0].id).toBe("d1t0");
    });

    it("preserves task content", () => {
        const days = materializePlan(output);
        expect(days[0].tasks[1]).toMatchObject({
            type: "talk",
            title: "B",
            competency: "y",
        });
    });
});

const days: OnboardingDay[] = [
    {
        title: "Día 1",
        tasks: [
            {
                id: "d0t0",
                type: "read",
                title: "A",
                detail: "a",
                competency: "x",
            },
            {
                id: "d0t1",
                type: "talk",
                title: "B",
                detail: "b",
                competency: "y",
            },
        ],
    },
    {
        title: "Día 2",
        tasks: [
            {
                id: "d1t0",
                type: "do",
                title: "C",
                detail: "c",
                competency: "z",
            },
        ],
    },
];

describe("computeProgress", () => {
    it("counts done over total across all days", () => {
        expect(computeProgress(days, ["d0t0"])).toEqual({
            done: 1,
            total: 3,
            isComplete: false,
        });
    });

    it("ignores stale ids that no longer exist in the plan", () => {
        expect(computeProgress(days, ["d0t0", "gone"])).toEqual({
            done: 1,
            total: 3,
            isComplete: false,
        });
    });

    it("is complete only when every task is done", () => {
        expect(computeProgress(days, ["d0t0", "d0t1", "d1t0"]).isComplete).toBe(
            true,
        );
    });

    it("an empty plan is never complete", () => {
        expect(computeProgress([], [])).toEqual({
            done: 0,
            total: 0,
            isComplete: false,
        });
    });
});

describe("toggleCompleted", () => {
    it("adds a valid task id that was not yet done", () => {
        expect(toggleCompleted(days, [], "d0t1")).toEqual(["d0t1"]);
    });

    it("removes a task id that was already done", () => {
        expect(toggleCompleted(days, ["d0t0", "d0t1"], "d0t0")).toEqual([
            "d0t1",
        ]);
    });

    it("leaves the set untouched for an id absent from the plan", () => {
        expect(toggleCompleted(days, ["d0t0"], "nope")).toEqual(["d0t0"]);
    });
});
