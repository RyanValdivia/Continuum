import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("../../repository/person-profile", () => ({
    findOrgMemberById: vi.fn(),
    findPersonNodes: vi.fn(),
    findPersonDocuments: vi.fn(),
}));

import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    findOrgMemberById,
    findPersonDocuments,
    findPersonNodes,
} from "../../repository/person-profile";
import { getPersonProfileService } from "../get-person-profile-service";

const ORG = "org1";
const VIEWER = "viewer";
const TARGET = "m1";

describe("getPersonProfileService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "member" });
        vi.mocked(findOrgMemberById).mockResolvedValue({
            memberId: TARGET,
            name: "María",
            email: "maria@x.com",
            role: "member",
        });
        vi.mocked(findPersonNodes).mockResolvedValue([
            {
                type: "decision",
                label: "Facturación",
                summary: "cobra mensual",
            },
            { type: "process", label: "Deploy", summary: null },
            { type: "concept", label: "Idempotencia", summary: null },
        ]);
        vi.mocked(findPersonDocuments).mockResolvedValue([
            { title: "Runbook", url: "http://x" },
            { title: "Notas", url: null },
        ]);
    });

    it("forbids non-members of the organization", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue(null as never);
        const result = await getPersonProfileService(VIEWER, ORG, TARGET);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(403);
    });

    it("404s when the target member is not in the org", async () => {
        vi.mocked(findOrgMemberById).mockResolvedValue(null);
        const result = await getPersonProfileService(VIEWER, ORG, "ghost");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(404);
    });

    it("composes the person, grouped know-how, docs and counts", async () => {
        const result = await getPersonProfileService(VIEWER, ORG, TARGET);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const p = result.data;
        expect(p.person).toEqual({
            memberId: TARGET,
            name: "María",
            email: "maria@x.com",
            role: "member",
        });
        expect(p.counts).toEqual({
            decisions: 1,
            processes: 1,
            concepts: 1,
            documents: 2,
        });
        expect(p.decisions).toEqual([
            { label: "Facturación", summary: "cobra mensual" },
        ]);
        expect(p.documents).toEqual([
            { title: "Runbook", url: "http://x" },
            { title: "Notas", url: null },
        ]);
        expect(p.hasKnowledge).toBe(true);
    });

    it("flags an empty profile so the UI can show a capture prompt", async () => {
        vi.mocked(findPersonNodes).mockResolvedValue([]);
        vi.mocked(findPersonDocuments).mockResolvedValue([]);
        const result = await getPersonProfileService(VIEWER, ORG, TARGET);
        if (!result.ok) throw new Error("expected ok");
        expect(result.data.hasKnowledge).toBe(false);
    });

    it("maps repository failures to INTERNAL_SERVER_ERROR", async () => {
        vi.mocked(findPersonNodes).mockRejectedValue(new Error("db down"));
        const result = await getPersonProfileService(VIEWER, ORG, TARGET);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    });
});
