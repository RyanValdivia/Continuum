/**
 * Knowledge Continuity Score — pure math over graph aggregates.
 *
 * The score answers one question: "if a key person leaves tomorrow, how much of
 * their knowledge survives in the organization?" It is a weighted blend of three
 * higher-is-better sub-scores (coverage, spread, connectivity) rendered 0–100.
 * Every function here is pure and deterministic — the repository feeds it plain
 * counts, no database access leaks in.
 */

/** Exclusive areas a group of owners must reach for the bus factor to count. */
export const CRITICAL_MASS = 5;

/** Component weights (sum to 1). Spread carries the most weight: concentration
 *  of exclusive knowledge is the sharpest continuity risk. */
export const CONTINUITY_WEIGHTS = {
    coverage: 0.3,
    spread: 0.4,
    connectivity: 0.3,
} as const;

const ratio = (part: number, whole: number): number =>
    whole <= 0 ? 0 : part / whole;

/** Fraction of members whose knowledge is captured in the graph. */
export const computeCoverage = (
    membersWithKnowledge: number,
    totalMembers: number,
): number => ratio(membersWithKnowledge, totalMembers);

/** Fraction of attributed nodes owned by exactly one person (single points of
 *  failure). Higher = more concentrated = riskier. */
export const computeConcentration = (
    soleOwnedNodes: number,
    attributedNodes: number,
): number => ratio(soleOwnedNodes, attributedNodes);

/** Fraction of nodes wired into the graph by at least one edge. */
export const computeConnectivity = (
    nodesWithEdge: number,
    totalNodes: number,
): number => ratio(nodesWithEdge, totalNodes);

/**
 * Smallest number of people whose combined exclusive areas reach CRITICAL_MASS.
 * When the whole org holds fewer than CRITICAL_MASS exclusive areas, the bus
 * factor is simply the number of people holding any exclusive area (0 = no
 * single-point-of-failure knowledge at all).
 */
export const computeBusFactor = (
    soleOwnedCounts: number[],
    criticalMass: number = CRITICAL_MASS,
): number => {
    const owners = soleOwnedCounts.filter((c) => c > 0).sort((a, b) => b - a);
    const total = owners.reduce((sum, c) => sum + c, 0);
    if (total < criticalMass) return owners.length;

    let cumulative = 0;
    for (let i = 0; i < owners.length; i++) {
        cumulative += owners[i];
        if (cumulative >= criticalMass) return i + 1;
    }
    return owners.length;
};

export type RiskBand = "low" | "medium" | "high";

/** Health band for a 0–100 score: <50 high risk, 50–75 medium, >75 low. */
export const riskBand = (score: number): RiskBand => {
    if (score < 50) return "high";
    if (score <= 75) return "medium";
    return "low";
};

export interface ContinuitySubScores {
    coverageScore: number;
    spreadScore: number;
    connectivityScore: number;
}

/** Weighted blend of the three higher-is-better sub-scores, rendered 0–100. */
export const computeContinuityScore = ({
    coverageScore,
    spreadScore,
    connectivityScore,
}: ContinuitySubScores): number =>
    Math.round(
        100 *
            (CONTINUITY_WEIGHTS.coverage * coverageScore +
                CONTINUITY_WEIGHTS.spread * spreadScore +
                CONTINUITY_WEIGHTS.connectivity * connectivityScore),
    );

export interface ScoreAggregates {
    totalMembers: number;
    membersWithKnowledge: number;
    totalNodes: number;
    nodesWithEdge: number;
    attributedNodes: number;
    soleOwnedNodes: number;
    /** Exclusive-area count per person (only owners with ≥1 exclusive area). */
    soleOwnedCounts: number[];
}

export interface ScoreBreakdown {
    score: number;
    band: RiskBand;
    busFactor: number;
    coverage: number;
    concentration: number;
    connectivity: number;
}

/**
 * Compose the full score from raw graph aggregates. An org with no attributed
 * knowledge gets NO spread credit (an empty graph is not "safe", it is unknown),
 * so an empty organization scores 0 rather than inflating on absent risk.
 */
export const computeScore = (agg: ScoreAggregates): ScoreBreakdown => {
    const coverage = computeCoverage(
        agg.membersWithKnowledge,
        agg.totalMembers,
    );
    const concentration = computeConcentration(
        agg.soleOwnedNodes,
        agg.attributedNodes,
    );
    const connectivity = computeConnectivity(agg.nodesWithEdge, agg.totalNodes);
    const spreadScore = agg.attributedNodes === 0 ? 0 : 1 - concentration;

    const score = computeContinuityScore({
        coverageScore: coverage,
        spreadScore,
        connectivityScore: connectivity,
    });

    return {
        score,
        band: riskBand(score),
        busFactor: computeBusFactor(agg.soleOwnedCounts),
        coverage,
        concentration,
        connectivity,
    };
};
