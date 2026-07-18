import { describe, expect, it } from "vitest";
import {
    analysisOutputSchema,
    applyInputSchema,
    candidateProfileSchema,
    createManualVacancySchema,
    offboardInputSchema,
    vacancySchema,
} from "../schemas";

describe("recruitment domain schemas", () => {
    it("parses a person-benchmark vacancy", () => {
        const v = vacancySchema.parse({
            id: "m1",
            organizationId: "org1",
            title: "Backend Senior",
            benchmarkType: "person",
            manualDescription: null,
            publicToken: "a".repeat(64),
            status: "open",
            createdAt: new Date().toISOString(),
        });
        expect(v.benchmarkType).toBe("person");
    });

    it("rejects a manual vacancy without description", () => {
        const result = createManualVacancySchema.safeParse({
            title: "X",
            description: "",
        });
        expect(result.success).toBe(false);
    });

    it("bounds offboard titles", () => {
        expect(offboardInputSchema.safeParse({ title: "" }).success).toBe(
            false,
        );
        expect(
            offboardInputSchema.safeParse({ title: "Backend Senior" }).success,
        ).toBe(true);
    });

    it("caps analysis output shapes", () => {
        const base = {
            score: 82,
            dimensions: [
                { name: "Procesos", score: 90, strengths: ["a"], gaps: [] },
                { name: "Dominio", score: 70, strengths: [], gaps: ["b"] },
                { name: "Criterio", score: 85, strengths: ["c"], gaps: [] },
            ],
            summary: "Buen fit",
            interviewQuestions: [
                { question: "q1", measures: "Procesos" },
                { question: "q2", measures: "Dominio" },
                { question: "q3", measures: "Criterio" },
            ],
        };
        expect(analysisOutputSchema.parse(base).score).toBe(82);
        expect(
            analysisOutputSchema.safeParse({ ...base, score: 120 }).success,
        ).toBe(false);
        expect(
            analysisOutputSchema.safeParse({ ...base, dimensions: [] }).success,
        ).toBe(false);
    });

    it("ties each interview question to what it measures", () => {
        const base = {
            score: 50,
            dimensions: [
                { name: "A", score: 50, strengths: [], gaps: [] },
                { name: "B", score: 50, strengths: [], gaps: [] },
                { name: "C", score: 50, strengths: [], gaps: [] },
            ],
            summary: "ok",
        };
        const parsed = analysisOutputSchema.parse({
            ...base,
            interviewQuestions: [
                { question: "¿Cómo escalas Postgres?", measures: "Dominio" },
                { question: "q2", measures: "Procesos" },
                { question: "q3", measures: "Criterio" },
            ],
        });
        expect(parsed.interviewQuestions[0]).toEqual({
            question: "¿Cómo escalas Postgres?",
            measures: "Dominio",
        });
        // bare strings are no longer valid
        expect(
            analysisOutputSchema.safeParse({
                ...base,
                interviewQuestions: ["q1", "q2", "q3"],
            }).success,
        ).toBe(false);
    });

    it("requires plainText in a parsed CV profile", () => {
        const p = candidateProfileSchema.parse({
            plainText: "CV text",
            summary: "Dev backend",
            skills: ["postgres"],
            yearsOfExperience: 5,
            experience: [{ role: "Dev", company: "Acme", summary: "apis" }],
        });
        expect(p.skills).toContain("postgres");
    });

    it("validates apply input sizes", () => {
        expect(
            applyInputSchema.safeParse({
                token: "t",
                name: "Ana",
                email: "ana@x.com",
                cv: {
                    data: new Uint8Array([1]),
                    filename: "cv.pdf",
                    mediaType: "application/pdf",
                },
            }).success,
        ).toBe(true);
        expect(
            applyInputSchema.safeParse({
                token: "t",
                name: "Ana",
                email: "not-an-email",
                cv: {
                    data: new Uint8Array([1]),
                    filename: "cv.pdf",
                    mediaType: "application/pdf",
                },
            }).success,
        ).toBe(false);
    });
});
