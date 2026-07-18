import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("../../repository/candidates", () => ({
    findCandidateWithVacancy: vi.fn(),
    setCandidateStatus: vi.fn(),
    listCandidatesWithAnalysis: vi.fn(),
    deleteCandidate: vi.fn(),
}));
vi.mock("../../repository/analyses", () => ({ upsertAnalysis: vi.fn() }));
vi.mock("../../repository/vacancies", () => ({ findVacancyById: vi.fn() }));
vi.mock("@/core/knowledge/server/services/search-knowledge-service", () => ({
    searchKnowledgeService: vi.fn(),
}));

import type { CandidateProfile } from "@/core/recruitment/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import type {
    AnalysisRow,
    CandidateRow,
    VacancyRow,
} from "@/server/drizzle/schemas/recruitment-schema";
import { upsertAnalysis } from "../../repository/analyses";
import {
    deleteCandidate,
    findCandidateWithVacancy,
    listCandidatesWithAnalysis,
    setCandidateStatus,
} from "../../repository/candidates";
import { findVacancyById } from "../../repository/vacancies";
import { deleteCandidateService } from "../delete-candidate-service";
import { listCandidatesService } from "../list-candidates-service";
import { retryAnalysisService } from "../retry-analysis-service";

const ORG = "org1";
const ADMIN = "admin-user";

const profile: CandidateProfile = {
    plainText: "cv",
    summary: "s",
    skills: [],
    yearsOfExperience: null,
    experience: [],
};

const candidateRow = (over: Partial<CandidateRow> = {}): CandidateRow => ({
    id: "c1",
    vacancyId: "v1",
    name: "Ana",
    email: "ana@x.com",
    cvFilename: "cv.pdf",
    cvText: "cv",
    profile,
    status: "failed",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const vacancyRow = (over: Partial<VacancyRow> = {}): VacancyRow => ({
    id: "v1",
    organizationId: ORG,
    title: "Backend",
    benchmarkType: "manual",
    manualDescription: "desc",
    publicToken: "t".repeat(64),
    status: "open",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const analysisRow = (over: Partial<AnalysisRow> = {}): AnalysisRow => ({
    candidateId: "c1",
    score: 77,
    dimensions: [],
    summary: "ok",
    interviewQuestions: [{ question: "q", measures: "m" }],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

describe("candidate admin services", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "owner" });
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: candidateRow(),
            vacancy: vacancyRow(),
        });
        vi.mocked(findVacancyById).mockResolvedValue(vacancyRow());
        vi.mocked(upsertAnalysis).mockImplementation(
            async (row) =>
                ({
                    ...row,
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                }) as AnalysisRow,
        );
    });

    it("retries analysis for a failed candidate (admin)", async () => {
        const result = await retryAnalysisService(ADMIN, ORG, "c1", {
            analyze: async () => ({
                score: 77,
                dimensions: [
                    { name: "a", score: 1, strengths: [], gaps: [] },
                    { name: "b", score: 2, strengths: [], gaps: [] },
                    { name: "c", score: 3, strengths: [], gaps: [] },
                ],
                summary: "ok",
                interviewQuestions: [
                    { question: "q1", measures: "m" },
                    { question: "q2", measures: "m" },
                    { question: "q3", measures: "m" },
                ],
            }),
        });
        expect(result.ok).toBe(true);
        expect(setCandidateStatus).toHaveBeenCalledWith("c1", "analyzed");
    });

    it("forbids retry for non-admins", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "member" });
        const result = await retryAnalysisService("u2", ORG, "c1");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(403);
    });

    it("maps the repository's ranked rows to wire shape, unanalyzed null", async () => {
        // The repository orders by score DESC NULLS LAST in SQL; the service
        // preserves that order and maps rows to the wire shape.
        vi.mocked(listCandidatesWithAnalysis).mockResolvedValue([
            {
                candidate: candidateRow({ id: "c-top" }),
                analysis: analysisRow({ candidateId: "c-top", score: 95 }),
            },
            {
                candidate: candidateRow({ id: "c-low" }),
                analysis: analysisRow({ candidateId: "c-low", score: 40 }),
            },
            {
                candidate: candidateRow({ id: "c-pending", status: "pending" }),
                analysis: null,
            },
        ]);

        const result = await listCandidatesService(ADMIN, ORG, "v1");
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.map((r) => r.candidate.id)).toEqual([
            "c-top",
            "c-low",
            "c-pending",
        ]);
        expect(result.data[0].analysis?.score).toBe(95);
        expect(result.data[2].analysis).toBeNull();
    });

    it("404s list when the vacancy belongs to another org", async () => {
        vi.mocked(findVacancyById).mockResolvedValue(null);
        const result = await listCandidatesService(ADMIN, ORG, "ghost");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(404);
    });

    it("deletes a candidate (and its analysis via cascade)", async () => {
        vi.mocked(deleteCandidate).mockResolvedValue(true);
        const result = await deleteCandidateService(ADMIN, ORG, "c1");
        expect(result.ok).toBe(true);
        expect(deleteCandidate).toHaveBeenCalledWith("c1");
    });
});
