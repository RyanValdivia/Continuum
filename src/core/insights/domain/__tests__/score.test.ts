import { describe, expect, it } from "vitest";
import {
    CRITICAL_MASS,
    computeBusFactor,
    computeConcentration,
    computeConnectivity,
    computeContinuityScore,
    computeCoverage,
    computeScore,
    riskBand,
} from "../score";

describe("computeCoverage", () => {
    it("is the fraction of members with captured knowledge", () => {
        expect(computeCoverage(3, 4)).toBe(0.75);
    });

    it("is 0 when there are no members (no divide-by-zero)", () => {
        expect(computeCoverage(0, 0)).toBe(0);
    });
});

describe("computeConcentration", () => {
    it("is the fraction of attributed nodes owned by a single person", () => {
        expect(computeConcentration(3, 10)).toBe(0.3);
    });

    it("is 0 when nothing is attributed", () => {
        expect(computeConcentration(0, 0)).toBe(0);
    });
});

describe("computeConnectivity", () => {
    it("is the fraction of nodes that have at least one edge", () => {
        expect(computeConnectivity(8, 10)).toBe(0.8);
    });

    it("is 0 when there are no nodes", () => {
        expect(computeConnectivity(0, 0)).toBe(0);
    });
});

describe("computeBusFactor", () => {
    it("is the smallest group of owners reaching CRITICAL_MASS exclusive areas", () => {
        // sorted desc [3,2,2]: 3 (<5), +2 = 5 (>=5) -> 2 people
        expect(computeBusFactor([2, 3, 2])).toBe(2);
    });

    it("is 1 when a single person already holds critical mass", () => {
        expect(computeBusFactor([10])).toBe(1);
    });

    it("falls back to the count of exclusive owners when below critical mass", () => {
        // total exclusive = 3 < 5 -> everyone holding >=1 exclusive area
        expect(computeBusFactor([2, 1])).toBe(2);
    });

    it("ignores people with no exclusive areas", () => {
        expect(computeBusFactor([3, 0, 1])).toBe(2);
    });

    it("is 0 when nobody exclusively owns anything (no risk)", () => {
        expect(computeBusFactor([])).toBe(0);
        expect(computeBusFactor([0, 0])).toBe(0);
    });

    it("honors a custom critical mass", () => {
        expect(computeBusFactor([2, 2, 2], 2)).toBe(1);
    });
});

describe("riskBand", () => {
    it("maps score to a health band", () => {
        expect(riskBand(49)).toBe("high");
        expect(riskBand(50)).toBe("medium");
        expect(riskBand(75)).toBe("medium");
        expect(riskBand(76)).toBe("low");
    });
});

describe("computeContinuityScore", () => {
    it("weights three higher-is-better sub-scores into 0-100", () => {
        // 0.30*0.5 + 0.40*0.7 + 0.30*0.7 = 0.15 + 0.28 + 0.21 = 0.64
        expect(
            computeContinuityScore({
                coverageScore: 0.5,
                spreadScore: 0.7,
                connectivityScore: 0.7,
            }),
        ).toBe(64);
    });

    it("is 100 when every sub-score is perfect", () => {
        expect(
            computeContinuityScore({
                coverageScore: 1,
                spreadScore: 1,
                connectivityScore: 1,
            }),
        ).toBe(100);
    });

    it("is 0 when every sub-score is zero", () => {
        expect(
            computeContinuityScore({
                coverageScore: 0,
                spreadScore: 0,
                connectivityScore: 0,
            }),
        ).toBe(0);
    });

    it("exposes CRITICAL_MASS as the bus-factor threshold", () => {
        expect(CRITICAL_MASS).toBe(5);
    });
});

describe("computeScore", () => {
    it("scores an empty organization at 0 — no free spread credit", () => {
        const result = computeScore({
            totalMembers: 4,
            membersWithKnowledge: 0,
            totalNodes: 0,
            attributedNodes: 0,
            soleOwnedNodes: 0,
            nodesWithEdge: 0,
            soleOwnedCounts: [],
        });
        expect(result.score).toBe(0);
        expect(result.band).toBe("high");
        expect(result.busFactor).toBe(0);
    });

    it("composes coverage, spread, connectivity, bus factor and band", () => {
        const result = computeScore({
            totalMembers: 4,
            membersWithKnowledge: 2, // coverage 0.5
            totalNodes: 10,
            nodesWithEdge: 7, // connectivity 0.7
            attributedNodes: 10,
            soleOwnedNodes: 3, // concentration 0.3 -> spread 0.7
            soleOwnedCounts: [2, 1], // total 3 < 5 -> bus factor 2
        });
        expect(result.coverage).toBe(0.5);
        expect(result.concentration).toBe(0.3);
        expect(result.connectivity).toBe(0.7);
        expect(result.score).toBe(64);
        expect(result.band).toBe("medium");
        expect(result.busFactor).toBe(2);
    });
});
