import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("../../repository/insights", () => ({
    findGraphCounts: vi.fn(),
    findPersonKnowledgeStats: vi.fn(),
    findOrgMembers: vi.fn(),
}));

import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    findGraphCounts,
    findOrgMembers,
    findPersonKnowledgeStats,
} from "../../repository/insights";
import { getDashboardService } from "../get-dashboard-service";

const ORG = "org1";
const ADMIN = "admin-user";

describe("getDashboardService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "owner" });
        vi.mocked(findGraphCounts).mockResolvedValue({
            totalNodes: 10,
            nodesWithEdge: 7,
            totalEdges: 12,
            totalDocuments: 5,
        });
        vi.mocked(findOrgMembers).mockResolvedValue([
            { memberId: "m1", name: "Ana", email: "ana@x.com" },
            { memberId: "m2", name: "Bob", email: "bob@x.com" },
            { memberId: "m3", name: "Cai", email: "cai@x.com" },
            { memberId: "m4", name: "Dee", email: "dee@x.com" },
        ]);
        vi.mocked(findPersonKnowledgeStats).mockResolvedValue([
            {
                personId: "m1",
                attributedNodes: 6,
                soleOwnedNodes: 2,
                criticalAreas: ["Facturación", "AWS"],
            },
            {
                personId: "m2",
                attributedNodes: 4,
                soleOwnedNodes: 1,
                criticalAreas: ["Deploy"],
            },
        ]);
    });

    it("forbids non-admins", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "member" });
        const result = await getDashboardService(ADMIN, ORG);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(403);
    });

    it("composes the continuity score from graph aggregates", async () => {
        const result = await getDashboardService(ADMIN, ORG);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        // coverage 2/4=.5, connectivity 7/10=.7, concentration 3/10=.3 -> spread .7
        // 0.3*.5 + 0.4*.7 + 0.3*.7 = .64
        expect(result.data.score.score).toBe(64);
        expect(result.data.score.band).toBe("medium");
        expect(result.data.score.busFactor).toBe(2);
        expect(result.data.score.coverage).toBe(0.5);
    });

    it("lists key people sorted by captured knowledge, members with none last", async () => {
        const result = await getDashboardService(ADMIN, ORG);
        if (!result.ok) throw new Error("expected ok");
        expect(result.data.keyPeople.map((p) => p.memberId)).toEqual([
            "m1",
            "m2",
            "m3",
            "m4",
        ]);
        expect(result.data.keyPeople[0]).toMatchObject({
            memberId: "m1",
            name: "Ana",
            nodeCount: 6,
            exclusiveCount: 2,
        });
        expect(result.data.keyPeople[3]).toMatchObject({
            memberId: "m4",
            nodeCount: 0,
            exclusiveCount: 0,
        });
    });

    it("ranks top risks by exclusive knowledge with named areas", async () => {
        const result = await getDashboardService(ADMIN, ORG);
        if (!result.ok) throw new Error("expected ok");
        expect(result.data.topRisks).toEqual([
            {
                memberId: "m1",
                name: "Ana",
                exclusiveCount: 2,
                areas: ["Facturación", "AWS"],
            },
            {
                memberId: "m2",
                name: "Bob",
                exclusiveCount: 1,
                areas: ["Deploy"],
            },
        ]);
    });

    it("reports totals for the header tiles", async () => {
        const result = await getDashboardService(ADMIN, ORG);
        if (!result.ok) throw new Error("expected ok");
        expect(result.data.totals).toEqual({
            members: 4,
            nodes: 10,
            edges: 12,
            documents: 5,
        });
    });

    it("maps repository failures to INTERNAL_SERVER_ERROR", async () => {
        vi.mocked(findGraphCounts).mockRejectedValue(new Error("db down"));
        const result = await getDashboardService(ADMIN, ORG);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    });
});
