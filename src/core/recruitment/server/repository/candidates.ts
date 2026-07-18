import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { CandidateStatus } from "@/core/recruitment/domain/types";
import { db } from "@/server/drizzle/db";
import {
    type AnalysisRow,
    analysis,
    type CandidateRow,
    candidate,
    type NewCandidateRow,
    type VacancyRow,
    vacancy,
} from "@/server/drizzle/schemas/recruitment-schema";

export async function insertCandidate(
    row: NewCandidateRow,
): Promise<CandidateRow> {
    const [inserted] = await db.insert(candidate).values(row).returning();
    return inserted;
}

export async function findCandidateByEmail(
    vacancyId: string,
    email: string,
): Promise<CandidateRow | null> {
    const [row] = await db
        .select()
        .from(candidate)
        .where(
            and(eq(candidate.vacancyId, vacancyId), eq(candidate.email, email)),
        )
        .limit(1);
    return row ?? null;
}

/** Candidate joined to its vacancy — the org/benchmark scoping read. */
export async function findCandidateWithVacancy(
    candidateId: string,
): Promise<{ candidate: CandidateRow; vacancy: VacancyRow } | null> {
    const [row] = await db
        .select({ candidate, vacancy })
        .from(candidate)
        .innerJoin(vacancy, eq(candidate.vacancyId, vacancy.id))
        .where(eq(candidate.id, candidateId))
        .limit(1);
    return row ?? null;
}

export async function setCandidateStatus(
    id: string,
    status: CandidateStatus,
): Promise<void> {
    await db.update(candidate).set({ status }).where(eq(candidate.id, id));
}

/** Score desc, unanalyzed last — the ranking read. */
export async function listCandidatesWithAnalysis(
    vacancyId: string,
): Promise<{ candidate: CandidateRow; analysis: AnalysisRow | null }[]> {
    return db
        .select({ candidate, analysis })
        .from(candidate)
        .leftJoin(analysis, eq(analysis.candidateId, candidate.id))
        .where(eq(candidate.vacancyId, vacancyId))
        .orderBy(
            sql`${analysis.score} DESC NULLS LAST`,
            desc(candidate.createdAt),
        );
}

export async function deleteCandidate(id: string): Promise<boolean> {
    const deleted = await db
        .delete(candidate)
        .where(eq(candidate.id, id))
        .returning({ id: candidate.id });
    return deleted.length > 0;
}
