import type {
    Analysis,
    Candidate,
    Vacancy,
} from "@/core/recruitment/domain/types";
import type {
    AnalysisRow,
    CandidateRow,
    VacancyRow,
} from "@/server/drizzle/schemas/recruitment-schema";

export const toVacancy = (row: VacancyRow): Vacancy => ({
    id: row.id,
    organizationId: row.organizationId,
    title: row.title,
    benchmarkType: row.benchmarkType,
    manualDescription: row.manualDescription,
    publicToken: row.publicToken,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
});

export const toCandidate = (row: CandidateRow): Candidate => ({
    id: row.id,
    vacancyId: row.vacancyId,
    name: row.name,
    email: row.email,
    cvFilename: row.cvFilename,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
});

export const toAnalysis = (row: AnalysisRow): Analysis => ({
    candidateId: row.candidateId,
    score: row.score,
    dimensions: row.dimensions,
    summary: row.summary,
    interviewQuestions: row.interviewQuestions,
    createdAt: row.createdAt.toISOString(),
});
