import { describe, expect, it } from "vitest";
import { aggregatePersonStats } from "../person-stats";

describe("aggregatePersonStats", () => {
    it("counts attributed nodes and flags areas owned by a single person", () => {
        const stats = aggregatePersonStats([
            { personId: "m1", label: "Billing" },
            { personId: "m1", label: "AWS" },
            { personId: "m1", label: "Shared" },
            { personId: "m2", label: "Shared" },
            { personId: "m2", label: "Deploy" },
        ]);
        expect(stats).toEqual([
            {
                personId: "m1",
                attributedNodes: 3,
                soleOwnedNodes: 2,
                criticalAreas: ["Billing", "AWS"],
            },
            {
                personId: "m2",
                attributedNodes: 2,
                soleOwnedNodes: 1,
                criticalAreas: ["Deploy"],
            },
        ]);
    });

    it("counts repeated same-owner nodes but lists each area once", () => {
        const stats = aggregatePersonStats([
            { personId: "m1", label: "AWS" },
            { personId: "m1", label: "AWS" },
        ]);
        expect(stats).toEqual([
            {
                personId: "m1",
                attributedNodes: 2,
                soleOwnedNodes: 2,
                criticalAreas: ["AWS"],
            },
        ]);
    });

    it("returns an empty list for no attribution", () => {
        expect(aggregatePersonStats([])).toEqual([]);
    });
});
