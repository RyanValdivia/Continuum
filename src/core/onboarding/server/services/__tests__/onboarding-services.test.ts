import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("@/core/knowledge/server/services/search-knowledge-service", () => ({
    searchKnowledgeService: vi.fn(),
}));
vi.mock("../../repository/plans", () => ({
    insertPlan: vi.fn(),
    findLatestPlanByMember: vi.fn(),
    findPlanById: vi.fn(),
    setCompletedTaskIds: vi.fn(),
}));
vi.mock("../../repository/members", () => ({ listOrgMembers: vi.fn() }));

import { searchKnowledgeService } from "@/core/knowledge/server/services/search-knowledge-service";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import { ok } from "@/server/common/responses";
import type { OnboardingPlanRow } from "@/server/drizzle/schemas/onboarding-schema";
import type { GenerateOnboardingFn } from "../../llm/generate-plan";
import { listOrgMembers } from "../../repository/members";
import {
    findLatestPlanByMember,
    findPlanById,
    insertPlan,
    setCompletedTaskIds,
} from "../../repository/plans";
import { generateOnboardingPlanService } from "../generate-onboarding-plan-service";
import { getMyOnboardingService } from "../get-my-onboarding-service";
import { listOnboardingTargetsService } from "../list-onboarding-targets-service";
import { toggleTaskService } from "../toggle-task-service";

const ORG = "org1";
const USER = "member-me";

// biome-ignore lint/suspicious/noExplicitAny: mocked cross-module result
const searchOk = (over: any = {}) =>
    ok({
        query: "q",
        chunks: [{ content: "María eligió Postgres." }],
        nodes: [{ type: "decision", label: "Usar Postgres", summary: null }],
        edges: [],
        ...over,
        // biome-ignore lint/suspicious/noExplicitAny: structural digest source only
    }) as any;

const fakeGenerate: GenerateOnboardingFn = async () => ({
    days: [
        {
            title: "Día 1",
            tasks: [
                { type: "read", title: "A", detail: "a", competency: "x" },
                { type: "talk", title: "B", detail: "b", competency: "y" },
            ],
        },
        {
            title: "Día 2",
            tasks: [{ type: "do", title: "C", detail: "c", competency: "z" }],
        },
    ],
});

const planRow = (over: Partial<OnboardingPlanRow> = {}): OnboardingPlanRow => ({
    id: "plan1",
    organizationId: ORG,
    newHireMemberId: USER,
    roleTitle: "Product Designer",
    benchmarkPersonId: "member-maria",
    benchmarkPersonName: "María",
    vacancyId: null,
    days: [
        {
            title: "Día 1",
            tasks: [
                {
                    id: "d0t0",
                    type: "read",
                    title: "A",
                    detail: "a",
                    competency: "x",
                },
                {
                    id: "d0t1",
                    type: "talk",
                    title: "B",
                    detail: "b",
                    competency: "y",
                },
            ],
        },
        {
            title: "Día 2",
            tasks: [
                {
                    id: "d1t0",
                    type: "do",
                    title: "C",
                    detail: "c",
                    competency: "z",
                },
            ],
        },
    ],
    completedTaskIds: [],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrgMembership).mockResolvedValue({ role: "member" });
});

describe("generateOnboardingPlanService", () => {
    beforeEach(() => {
        vi.mocked(searchKnowledgeService).mockResolvedValue(searchOk());
        vi.mocked(insertPlan).mockImplementation(async (row) =>
            planRow({
                days: row.days,
                completedTaskIds: row.completedTaskIds ?? [],
                newHireMemberId: row.newHireMemberId,
                benchmarkPersonName: row.benchmarkPersonName ?? null,
            }),
        );
    });

    it("generates, stamps task ids, persists under the current member, returns progress", async () => {
        const result = await generateOnboardingPlanService(
            USER,
            ORG,
            {
                roleTitle: "Product Designer",
                benchmarkPersonId: "member-maria",
                benchmarkPersonName: "María",
            },
            { generate: fakeGenerate },
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.days[0].tasks[0].id).toBe("d0t0");
        expect(result.data.days[1].tasks[0].id).toBe("d1t0");
        expect(result.data.progress).toEqual({
            done: 0,
            total: 3,
            isComplete: false,
        });

        const inserted = vi.mocked(insertPlan).mock.calls[0][0];
        expect(inserted.newHireMemberId).toBe(USER);
        expect(inserted.benchmarkPersonName).toBe("María");
        expect(inserted.days[0].tasks[0].id).toBe("d0t0");
    });

    it("scopes the role digest to the predecessor's personId", async () => {
        await generateOnboardingPlanService(
            USER,
            ORG,
            { roleTitle: "Designer", benchmarkPersonId: "member-maria" },
            { generate: fakeGenerate },
        );
        const params = vi.mocked(searchKnowledgeService).mock.calls[0][1];
        expect(params.personId).toBe("member-maria");
    });

    it("forbids non-members", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue(
            null as unknown as { role: string },
        );
        const result = await generateOnboardingPlanService(
            USER,
            ORG,
            { roleTitle: "Designer" },
            { generate: fakeGenerate },
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
        expect(insertPlan).not.toHaveBeenCalled();
    });

    it("returns INTERNAL_SERVER_ERROR and does not persist when generation throws", async () => {
        const boom: GenerateOnboardingFn = async () => {
            throw new Error("gemini down");
        };
        const result = await generateOnboardingPlanService(
            USER,
            ORG,
            { roleTitle: "Designer" },
            { generate: boom },
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
        expect(insertPlan).not.toHaveBeenCalled();
    });
});

describe("getMyOnboardingService", () => {
    it("returns null when the member has no plan", async () => {
        vi.mocked(findLatestPlanByMember).mockResolvedValue(null);
        const result = await getMyOnboardingService(USER, ORG);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data).toBeNull();
    });

    it("returns the plan with derived progress", async () => {
        vi.mocked(findLatestPlanByMember).mockResolvedValue(
            planRow({ completedTaskIds: ["d0t0"] }),
        );
        const result = await getMyOnboardingService(USER, ORG);
        expect(result.ok).toBe(true);
        if (result.ok && result.data)
            expect(result.data.progress).toEqual({
                done: 1,
                total: 3,
                isComplete: false,
            });
    });
});

describe("toggleTaskService", () => {
    it("toggles a task on the member's own plan and persists the new set", async () => {
        vi.mocked(findPlanById).mockResolvedValue(planRow());
        vi.mocked(setCompletedTaskIds).mockImplementation(async (_id, ids) =>
            planRow({ completedTaskIds: ids }),
        );

        const result = await toggleTaskService(USER, ORG, "plan1", "d0t1");
        expect(result.ok).toBe(true);
        expect(vi.mocked(setCompletedTaskIds).mock.calls[0][1]).toEqual([
            "d0t1",
        ]);
        if (result.ok) expect(result.data.progress.done).toBe(1);
    });

    it("forbids toggling another member's plan", async () => {
        vi.mocked(findPlanById).mockResolvedValue(
            planRow({ newHireMemberId: "someone-else" }),
        );
        const result = await toggleTaskService(USER, ORG, "plan1", "d0t0");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
        expect(setCompletedTaskIds).not.toHaveBeenCalled();
    });

    it("404s an unknown plan", async () => {
        vi.mocked(findPlanById).mockResolvedValue(null);
        const result = await toggleTaskService(USER, ORG, "nope", "d0t0");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });
});

describe("listOnboardingTargetsService", () => {
    it("maps org members to predecessor targets", async () => {
        vi.mocked(listOrgMembers).mockResolvedValue([
            { memberId: "member-maria", name: "María", role: "member" },
        ]);
        const result = await listOnboardingTargetsService(USER, ORG);
        expect(result.ok).toBe(true);
        if (result.ok)
            expect(result.data).toEqual([
                { personId: "member-maria", name: "María", role: "member" },
            ]);
    });

    it("forbids non-members", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue(
            null as unknown as { role: string },
        );
        const result = await listOnboardingTargetsService(USER, ORG);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
    });
});
