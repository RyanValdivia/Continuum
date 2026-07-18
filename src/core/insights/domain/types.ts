import type { ScoreBreakdown } from "./score";

/** A member with how much of their knowledge is captured in the graph. */
export interface KeyPerson {
    memberId: string;
    name: string;
    email: string;
    /** Critical nodes attributed to this person. */
    nodeCount: number;
    /** Attributed nodes whose area no one else covers (single points of failure). */
    exclusiveCount: number;
}

/** A single point of failure: a person holding exclusive critical knowledge. */
export interface PersonRisk {
    memberId: string;
    name: string;
    exclusiveCount: number;
    /** Labels of the exclusive areas, for the "only X knows this" copy. */
    areas: string[];
}

export interface DashboardTotals {
    members: number;
    nodes: number;
    edges: number;
    documents: number;
}

export interface DashboardData {
    score: ScoreBreakdown;
    keyPeople: KeyPerson[];
    topRisks: PersonRisk[];
    totals: DashboardTotals;
}
