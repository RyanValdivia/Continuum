import type { z } from "zod";
import type {
    analysisDimensionSchema,
    analysisOutputSchema,
    analysisSchema,
    applyInputSchema,
    benchmarkTypeSchema,
    candidateProfileSchema,
    candidateSchema,
    candidateStatusSchema,
    createManualVacancySchema,
    offboardInputSchema,
    personListItemSchema,
    publicVacancySchema,
    rankedCandidateSchema,
    vacancyListItemSchema,
    vacancySchema,
    vacancyStatusSchema,
} from "./schemas";

export type BenchmarkType = z.infer<typeof benchmarkTypeSchema>;
export type VacancyStatus = z.infer<typeof vacancyStatusSchema>;
export type CandidateStatus = z.infer<typeof candidateStatusSchema>;
export type Vacancy = z.infer<typeof vacancySchema>;
export type VacancyListItem = z.infer<typeof vacancyListItemSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type AnalysisDimension = z.infer<typeof analysisDimensionSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type RankedCandidate = z.infer<typeof rankedCandidateSchema>;
export type PersonListItem = z.infer<typeof personListItemSchema>;
export type PublicVacancy = z.infer<typeof publicVacancySchema>;
export type OffboardInput = z.infer<typeof offboardInputSchema>;
export type CreateManualVacancyInput = z.infer<
    typeof createManualVacancySchema
>;
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;
export type ApplyInput = z.infer<typeof applyInputSchema>;
