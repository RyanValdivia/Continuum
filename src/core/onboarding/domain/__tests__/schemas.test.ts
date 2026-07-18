import { describe, expect, it } from "vitest";
import {
    createOnboardingInputSchema,
    onboardingPlanOutputSchema,
    onboardingPlanSchema,
} from "../schemas";

describe("onboarding domain schemas", () => {
    it("accepts a well-formed persisted plan", () => {
        const parsed = onboardingPlanSchema.safeParse({
            id: "plan1",
            organizationId: "org1",
            newHireMemberId: "member1",
            roleTitle: "Product Designer",
            benchmarkPersonId: "person-maria",
            benchmarkPersonName: "María",
            vacancyId: null,
            days: [
                {
                    title: "Día 1 — Contexto",
                    tasks: [
                        {
                            id: "d0t0",
                            type: "read",
                            title: "Lee el design system",
                            detail: "Revisa los tokens y componentes base.",
                            competency: "Fundamentos de diseño",
                        },
                    ],
                },
            ],
            completedTaskIds: ["d0t0"],
            createdAt: "2026-07-18T00:00:00.000Z",
        });
        expect(parsed.success).toBe(true);
    });

    it("rejects a task with an unknown type", () => {
        const parsed = onboardingPlanSchema.safeParse({
            id: "plan1",
            organizationId: "org1",
            newHireMemberId: "member1",
            roleTitle: "Role",
            benchmarkPersonId: null,
            benchmarkPersonName: null,
            vacancyId: null,
            days: [
                {
                    title: "Día 1",
                    tasks: [
                        {
                            id: "d0t0",
                            type: "sing", // not read | talk | do
                            title: "x",
                            detail: "y",
                            competency: "z",
                        },
                    ],
                },
            ],
            completedTaskIds: [],
            createdAt: "2026-07-18T00:00:00.000Z",
        });
        expect(parsed.success).toBe(false);
    });

    it("requires the LLM output to have at least two days", () => {
        const parsed = onboardingPlanOutputSchema.safeParse({
            days: [
                {
                    title: "Solo un día",
                    tasks: [
                        {
                            type: "do",
                            title: "t",
                            detail: "d",
                            competency: "c",
                        },
                    ],
                },
            ],
        });
        expect(parsed.success).toBe(false);
    });

    it("defaults create-input's optional benchmark fields to undefined", () => {
        const parsed = createOnboardingInputSchema.safeParse({
            roleTitle: "Backend Engineer",
        });
        expect(parsed.success).toBe(true);
        if (parsed.success) {
            expect(parsed.data.benchmarkPersonId).toBeUndefined();
        }
    });
});
