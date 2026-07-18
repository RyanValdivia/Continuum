import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../repository/vacancies", () => ({
    findVacancyByToken: vi.fn(),
    countCandidates: vi.fn(),
}));
vi.mock("../../repository/candidates", () => ({
    findCandidateByEmail: vi.fn(),
    insertCandidate: vi.fn(),
    findCandidateWithVacancy: vi.fn(),
    setCandidateStatus: vi.fn(),
}));
vi.mock("../../repository/analyses", () => ({ upsertAnalysis: vi.fn() }));
vi.mock("@/core/knowledge/server/services/search-knowledge-service", () => ({
    searchKnowledgeService: vi.fn(),
}));

import type { CandidateProfile } from "@/core/recruitment/domain/types";
import type {
    CandidateRow,
    VacancyRow,
} from "@/server/drizzle/schemas/recruitment-schema";
import type { ParseCvFn } from "../../llm/parse-cv";
import {
    findCandidateByEmail,
    findCandidateWithVacancy,
    insertCandidate,
    setCandidateStatus,
} from "../../repository/candidates";
import {
    countCandidates,
    findVacancyByToken,
} from "../../repository/vacancies";
import { applyToVacancyService } from "../apply-to-vacancy-service";

const TOKEN = "t".repeat(64);

const vacancyRow = (
    over: Partial<VacancyRow> = {},
): VacancyRow & { organizationName: string } => ({
    id: "v1",
    organizationId: "org1",
    title: "Backend Senior",
    benchmarkType: "manual",
    manualDescription: "desc",
    publicToken: TOKEN,
    status: "open",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    organizationName: "Acme",
    ...over,
});

const profile: CandidateProfile = {
    plainText: "CV de Ana...",
    summary: "Backend dev",
    skills: ["postgres", "typescript"],
    yearsOfExperience: 5,
    experience: [{ role: "Dev", company: "X", summary: "apis" }],
};

const fakeParse: ParseCvFn = async () => profile;

const input = {
    token: TOKEN,
    name: "Ana",
    email: "ana@x.com",
    cv: {
        data: new Uint8Array([1, 2, 3]),
        filename: "cv.pdf",
        mediaType: "application/pdf" as const,
    },
};

describe("applyToVacancyService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(findVacancyByToken).mockResolvedValue(vacancyRow());
        vi.mocked(countCandidates).mockResolvedValue(0);
        vi.mocked(findCandidateByEmail).mockResolvedValue(null);
        vi.mocked(insertCandidate).mockImplementation(
            async (row) => row as CandidateRow,
        );
    });

    it("silently accepts honeypot submissions without inserting", async () => {
        const result = await applyToVacancyService(
            { ...input, website: "http://spam" },
            { parseCv: fakeParse },
        );
        expect(result.ok).toBe(true);
        expect(insertCandidate).not.toHaveBeenCalled();
    });

    it("404s identically for unknown token and closed vacancy", async () => {
        vi.mocked(findVacancyByToken).mockResolvedValue(null);
        const unknown = await applyToVacancyService(input, {
            parseCv: fakeParse,
        });
        expect(unknown.ok).toBe(false);
        if (!unknown.ok) expect(unknown.error.status).toBe(404);

        vi.mocked(findVacancyByToken).mockResolvedValue(
            vacancyRow({ status: "closed" }),
        );
        const closed = await applyToVacancyService(input, {
            parseCv: fakeParse,
        });
        expect(closed.ok).toBe(false);
        if (!closed.ok) expect(closed.error.status).toBe(404);
    });

    it("429s when the vacancy is full", async () => {
        vi.mocked(countCandidates).mockResolvedValue(200);
        const result = await applyToVacancyService(input, {
            parseCv: fakeParse,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(429);
    });

    it("conflicts on duplicate email per vacancy", async () => {
        vi.mocked(findCandidateByEmail).mockResolvedValue({} as CandidateRow);
        const result = await applyToVacancyService(input, {
            parseCv: fakeParse,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("CONFLICT");
    });

    it("422s when the CV cannot be parsed", async () => {
        const result = await applyToVacancyService(input, {
            parseCv: async () => {
                throw new Error("unreadable");
            },
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(422);
        expect(insertCandidate).not.toHaveBeenCalled();
    });

    it("stores the candidate as pending with the parsed profile", async () => {
        const result = await applyToVacancyService(input, {
            parseCv: fakeParse,
        });
        expect(result.ok).toBe(true);

        const inserted = vi.mocked(insertCandidate).mock.calls[0][0];
        expect(inserted.vacancyId).toBe("v1");
        expect(inserted.email).toBe("ana@x.com");
        expect(inserted.cvText).toBe("CV de Ana...");
        expect(inserted.profile).toEqual(profile);
        expect(inserted.status).toBe("pending");
    });

    it("runs analysis right after intake", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: {
                id: "c1",
                vacancyId: "v1",
                name: "Ana",
                email: "ana@x.com",
                cvFilename: "cv.pdf",
                cvText: profile.plainText,
                profile,
                status: "pending",
                createdAt: new Date(),
            },
            vacancy: vacancyRow(),
        });
        const analyze = vi.fn().mockResolvedValue({
            score: 50,
            dimensions: [
                { name: "a", score: 1, strengths: [], gaps: [] },
                { name: "b", score: 2, strengths: [], gaps: [] },
                { name: "c", score: 3, strengths: [], gaps: [] },
            ],
            summary: "s",
            interviewQuestions: ["q1", "q2", "q3"],
        });

        const result = await applyToVacancyService(input, {
            parseCv: fakeParse,
            analyze,
        });

        expect(result.ok).toBe(true);
        expect(analyze).toHaveBeenCalledOnce();
    });

    it("still returns received when analysis fails", async () => {
        vi.mocked(findCandidateWithVacancy).mockResolvedValue({
            candidate: {
                id: "c1",
                vacancyId: "v1",
                name: "Ana",
                email: "ana@x.com",
                cvFilename: "cv.pdf",
                cvText: profile.plainText,
                profile,
                status: "pending",
                createdAt: new Date(),
            },
            vacancy: vacancyRow(),
        });

        const result = await applyToVacancyService(input, {
            parseCv: fakeParse,
            analyze: async () => {
                throw new Error("model down");
            },
        });

        expect(result.ok).toBe(true);
        expect(setCandidateStatus).toHaveBeenCalledWith("c1", "failed");
    });
});
