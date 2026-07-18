import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/knowledge/server/services/search-knowledge-service", () => ({
    searchKnowledgeService: vi.fn(),
}));
vi.mock("../../repository/candidates", () => ({
    findCandidateWithVacancy: vi.fn(),
    setCandidateStatus: vi.fn(),
}));
vi.mock("../../repository/analyses", () => ({ upsertAnalysis: vi.fn() }));

import { searchKnowledgeService } from "@/core/knowledge/server/services/search-knowledge-service";
import type {
    AnalysisOutput,
    CandidateProfile,
} from "@/core/recruitment/domain/types";
import type {
    AnalysisRow,
    CandidateRow,
    VacancyRow,
} from "@/server/drizzle/schemas/recruitment-schema";
import type { AnalyzeBenchmarkFn } from "../../llm/analyze";
import { upsertAnalysis } from "../../repository/analyses";
import {
    findCandidateWithVacancy,
    setCandidateStatus,
} from "../../repository/candidates";
import { analyzeCandidateService } from "../analyze-candidate-service";

const profile: CandidateProfile = {
    plainText: "CV de Ana",
    summary: "Backend dev",
    skills: ["postgres"],
    yearsOfExperience: 5,
    experience: [],
};

const candidateRow = (over: Partial<CandidateRow> = {}): CandidateRow => ({
    id: "c1",
    vacancyId: "v1",
    name: "Ana",
    email: "ana@x.com",
    cvFilename: "cv.pdf",
    cvText: "CV de Ana",
    profile,
    status: "pending",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const vacancyRow = (over: Partial<VacancyRow> = {}): VacancyRow => ({
    id: "v1",
    organizationId: "org1",
    title: "Backend Senior",
    benchmarkType: "manual",
    manualDescription: "Postgres + APIs",
    publicToken: "t".repeat(64),
    status: "open",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const output: AnalysisOutput = {
    score: 81,
    dimensions: [
        { name: "Procesos", score: 80, strengths: ["s"], gaps: ["g"] },
        { name: "Dominio", score: 82, strengths: [], gaps: [] },
        { name: "Criterio", score: 81, strengths: ["x"], gaps: [] },
    ],
    summary: "Buen fit",
    interviewQuestions: [
        { question: "q1", measures: "m" },
        { question: "q2", measures: "m" },
        { question: "q3", measures: "m" },
    ],
};

const fakeAnalyze: AnalyzeBenchmarkFn = async () => output;

describe("analyzeCandidateService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(upsertAnalysis).mockImplementation(
            async (row) =>
                ({
                    ...row,
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                }) as AnalysisRow,
        );
    });

    it("uses the manual description as benchmark without touching retrieval", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: candidateRow(),
            vacancy: vacancyRow({ benchmarkType: "manual" }),
        });

        const result = await analyzeCandidateService("c1", {
            analyze: fakeAnalyze,
        });

        expect(searchKnowledgeService).not.toHaveBeenCalled();
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data.score).toBe(81);
        expect(setCandidateStatus).toHaveBeenCalledWith("c1", "analyzed");
    });

    it("builds the person benchmark from retrieval scoped to the vacancy id", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: candidateRow(),
            vacancy: vacancyRow({
                id: "member-1",
                benchmarkType: "person",
                manualDescription: null,
            }),
        });
        vi.mocked(searchKnowledgeService).mockResolvedValue({
            ok: true,
            data: {
                query: "Backend Senior",
                chunks: [
                    {
                        id: "ch1",
                        documentId: "d1",
                        personId: "member-1",
                        content: "migré la API a Postgres",
                        ord: 0,
                        score: 0.9,
                    },
                ],
                nodes: [
                    {
                        id: "n1",
                        personId: "member-1",
                        type: "decision",
                        label: "Usar Postgres",
                        summary: "integridad relacional",
                        sourceChunkId: null,
                        origin: "sync",
                        confidence: 1,
                        createdAt: "2026-01-01T00:00:00.000Z",
                        score: 0.8,
                    },
                ],
                edges: [],
            },
        });

        const analyzeSpy = vi
            .fn<AnalyzeBenchmarkFn>()
            .mockResolvedValue(output);
        const result = await analyzeCandidateService("c1", {
            analyze: analyzeSpy,
        });

        expect(searchKnowledgeService).toHaveBeenCalledWith(
            "org1",
            expect.objectContaining({
                query: "Backend Senior",
                personId: "member-1",
            }),
            expect.anything(),
        );
        const benchmark = analyzeSpy.mock.calls[0][0].benchmark;
        expect(benchmark).toContain("Usar Postgres");
        expect(benchmark).toContain("migré la API a Postgres");
        expect(result.ok).toBe(true);
    });

    it("marks the candidate failed when the LLM blows up", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: candidateRow(),
            vacancy: vacancyRow(),
        });

        const result = await analyzeCandidateService("c1", {
            analyze: async () => {
                throw new Error("model down");
            },
        });

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
        expect(setCandidateStatus).toHaveBeenCalledWith("c1", "failed");
        expect(upsertAnalysis).not.toHaveBeenCalled();
    });

    it("404s on unknown candidate", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue(null);
        const result = await analyzeCandidateService("ghost", {
            analyze: fakeAnalyze,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(404);
    });
});
