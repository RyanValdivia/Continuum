import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("../../repository/people", () => ({
    findOrgMembers: vi.fn(),
    findPeopleNodes: vi.fn(),
    upsertPersonNodes: vi.fn(),
}));

import { getOrgMembership } from "@/server/auth/get-org-membership";
import type { KnowledgeNodeRow } from "@/server/drizzle/schemas/knowledge-schema";
import {
    findOrgMembers,
    findPeopleNodes,
    upsertPersonNodes,
} from "../../repository/people";
import { listPeopleService } from "../list-people-service";

const ORG = "org1";
const ADMIN = "admin-user";

const nodeRow = (over: Partial<KnowledgeNodeRow> = {}): KnowledgeNodeRow => ({
    id: "m1",
    organizationId: ORG,
    personId: null,
    type: "person",
    label: "Ana",
    summary: null,
    embedding: null,
    sourceChunkId: null,
    origin: "manual",
    confidence: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

describe("listPeopleService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "owner" });
        vi.mocked(findOrgMembers).mockResolvedValue([
            {
                memberId: "m1",
                name: "Ana",
                email: "ana@x.com",
                role: "owner",
            },
            {
                memberId: "m2",
                name: "Bob",
                email: "bob@x.com",
                role: "member",
            },
        ]);
        vi.mocked(findPeopleNodes).mockResolvedValue([
            nodeRow({ id: "m1", type: "vacancy" }),
        ]);
    });

    it("forbids non-admins", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "member" });
        const result = await listPeopleService("u1", ORG);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(403);
    });

    it("syncs person nodes and maps node state per member", async () => {
        const result = await listPeopleService(ADMIN, ORG);

        expect(upsertPersonNodes).toHaveBeenCalledWith(ORG, [
            { memberId: "m1", name: "Ana" },
            { memberId: "m2", name: "Bob" },
        ]);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data).toEqual([
            {
                memberId: "m1",
                name: "Ana",
                email: "ana@x.com",
                role: "owner",
                nodeType: "vacancy",
                vacancyId: "m1",
            },
            {
                memberId: "m2",
                name: "Bob",
                email: "bob@x.com",
                role: "member",
                nodeType: null,
                vacancyId: null,
            },
        ]);
    });

    it("maps repository failures to INTERNAL_SERVER_ERROR", async () => {
        vi.mocked(findOrgMembers).mockRejectedValue(new Error("db down"));
        const result = await listPeopleService(ADMIN, ORG);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    });
});
