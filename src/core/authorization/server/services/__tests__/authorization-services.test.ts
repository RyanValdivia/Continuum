import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("../../repository/find-principal-by-id", () => ({
    findPrincipalById: vi.fn(),
}));
vi.mock("../../repository/insert-principal", () => ({
    insertPrincipal: vi.fn(),
}));
vi.mock("../../repository/update-principal", () => ({
    updatePrincipal: vi.fn(),
}));
vi.mock("../../repository/insert-membership", () => ({
    insertMembership: vi.fn(),
}));
vi.mock("../../repository/insert-ace", () => ({
    insertAce: vi.fn(),
}));

import { getOrgMembership } from "@/server/auth/get-org-membership";
import { findPrincipalById } from "../../repository/find-principal-by-id";
import { insertAce } from "../../repository/insert-ace";
import { insertMembership } from "../../repository/insert-membership";
import { insertPrincipal } from "../../repository/insert-principal";
import { updatePrincipal } from "../../repository/update-principal";
import { createPrincipalService } from "../create-principal-service";
import { grantAccessService } from "../grant-access-service";
import { setMembershipService } from "../set-membership-service";
import { updatePrincipalService } from "../update-principal-service";

const now = new Date("2026-01-01T00:00:00.000Z");

function mkPrincipal(overrides: {
    id?: string;
    type?: "person" | "group" | "ou";
    parentId?: string | null;
} = {}) {
    return {
        id: overrides.id ?? "p1",
        organizationId: "o1",
        type: overrides.type ?? "ou",
        name: "Test",
        description: null,
        userId: null,
        parentId: overrides.parentId ?? null,
        createdAt: now,
        updatedAt: now,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrgMembership).mockResolvedValue({ role: "admin" });
});

describe("createPrincipalService", () => {
    it("returns FORBIDDEN for a non-admin before touching the repository", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "member" });
        const r = await createPrincipalService("u1", "o1", {
            type: "group",
            name: "Legal",
            parentId: null,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
        expect(insertPrincipal).not.toHaveBeenCalled();
    });

    it("rejects a parentId that isn't an ou", async () => {
        vi.mocked(findPrincipalById).mockResolvedValue(
            mkPrincipal({ id: "g1", type: "group" }),
        );
        const r = await createPrincipalService("u1", "o1", {
            type: "ou",
            name: "Backend",
            parentId: "g1",
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("INVALID_BODY");
        expect(insertPrincipal).not.toHaveBeenCalled();
    });

    it("creates a group with no parent", async () => {
        vi.mocked(insertPrincipal).mockResolvedValue(
            mkPrincipal({ id: "g1", type: "group" }),
        );
        const r = await createPrincipalService("u1", "o1", {
            type: "group",
            name: "Legal",
            parentId: null,
        });
        expect(r.ok).toBe(true);
        expect(findPrincipalById).not.toHaveBeenCalled();
    });
});

describe("updatePrincipalService — cycle prevention", () => {
    it("rejects reparenting a principal under itself", async () => {
        vi.mocked(findPrincipalById).mockImplementation(async (_org, id) =>
            id === "ou1" ? mkPrincipal({ id: "ou1", type: "ou" }) : null,
        );
        const r = await updatePrincipalService("u1", "o1", "ou1", {
            parentId: "ou1",
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("CONFLICT");
        expect(updatePrincipal).not.toHaveBeenCalled();
    });

    it("rejects reparenting an OU under its own descendant", async () => {
        // Tree: root(ou-root) -> child(ou-child, parent=ou-root)
        // Attempting to move ou-root under ou-child must fail (would cycle).
        const tree: Record<string, ReturnType<typeof mkPrincipal>> = {
            "ou-root": mkPrincipal({ id: "ou-root", type: "ou", parentId: null }),
            "ou-child": mkPrincipal({
                id: "ou-child",
                type: "ou",
                parentId: "ou-root",
            }),
        };
        vi.mocked(findPrincipalById).mockImplementation(
            async (_org, id) => tree[id] ?? null,
        );

        const r = await updatePrincipalService("u1", "o1", "ou-root", {
            parentId: "ou-child",
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("CONFLICT");
        expect(updatePrincipal).not.toHaveBeenCalled();
    });

    it("allows moving a principal to an unrelated ou", async () => {
        const tree: Record<string, ReturnType<typeof mkPrincipal>> = {
            "ou-a": mkPrincipal({ id: "ou-a", type: "ou", parentId: null }),
            "ou-b": mkPrincipal({ id: "ou-b", type: "ou", parentId: null }),
        };
        vi.mocked(findPrincipalById).mockImplementation(
            async (_org, id) => tree[id] ?? null,
        );
        vi.mocked(updatePrincipal).mockResolvedValue(
            mkPrincipal({ id: "ou-a", type: "ou", parentId: "ou-b" }),
        );

        const r = await updatePrincipalService("u1", "o1", "ou-a", {
            parentId: "ou-b",
        });
        expect(r.ok).toBe(true);
        expect(updatePrincipal).toHaveBeenCalledWith("o1", "ou-a", {
            parentId: "ou-b",
        });
    });

    it("allows clearing the parent (move to root)", async () => {
        vi.mocked(findPrincipalById).mockResolvedValue(
            mkPrincipal({ id: "ou-a", type: "ou", parentId: "ou-b" }),
        );
        vi.mocked(updatePrincipal).mockResolvedValue(
            mkPrincipal({ id: "ou-a", type: "ou", parentId: null }),
        );

        const r = await updatePrincipalService("u1", "o1", "ou-a", {
            parentId: null,
        });
        expect(r.ok).toBe(true);
    });
});

describe("setMembershipService", () => {
    it("rejects a groupId that isn't actually a group", async () => {
        vi.mocked(findPrincipalById).mockImplementation(async (_org, id) => {
            if (id === "person-1") return mkPrincipal({ id, type: "person" });
            if (id === "ou-1") return mkPrincipal({ id, type: "ou" });
            return null;
        });
        const r = await setMembershipService("u1", "o1", {
            memberId: "person-1",
            groupId: "ou-1",
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("INVALID_BODY");
        expect(insertMembership).not.toHaveBeenCalled();
    });

    it("rejects an ou as a member (only person/group may join a group)", async () => {
        vi.mocked(findPrincipalById).mockImplementation(async (_org, id) => {
            if (id === "ou-1") return mkPrincipal({ id, type: "ou" });
            if (id === "group-1") return mkPrincipal({ id, type: "group" });
            return null;
        });
        const r = await setMembershipService("u1", "o1", {
            memberId: "ou-1",
            groupId: "group-1",
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("INVALID_BODY");
    });

    it("rejects self-membership", async () => {
        const r = await setMembershipService("u1", "o1", {
            memberId: "g1",
            groupId: "g1",
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("INVALID_BODY");
        expect(findPrincipalById).not.toHaveBeenCalled();
    });

    it("allows a group joining another group (nesting)", async () => {
        vi.mocked(findPrincipalById).mockImplementation(async (_org, id) =>
            mkPrincipal({ id, type: "group" }),
        );
        vi.mocked(insertMembership).mockResolvedValue({
            id: "m1",
            memberId: "engineers",
            groupId: "all-staff",
            createdAt: now,
        });
        const r = await setMembershipService("u1", "o1", {
            memberId: "engineers",
            groupId: "all-staff",
        });
        expect(r.ok).toBe(true);
    });
});

describe("grantAccessService", () => {
    it("rejects a principalId that doesn't exist in this org", async () => {
        vi.mocked(findPrincipalById).mockResolvedValue(null);
        const r = await grantAccessService("u1", "o1", {
            resourceType: "source_document",
            resourceId: "doc-1",
            principalId: "ghost",
            permission: "read",
            effect: "allow",
            inheritable: true,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("INVALID_BODY");
        expect(insertAce).not.toHaveBeenCalled();
    });

    it("writes an allow ACE attributed to the calling admin", async () => {
        vi.mocked(findPrincipalById).mockResolvedValue(
            mkPrincipal({ id: "legal-ou", type: "ou" }),
        );
        vi.mocked(insertAce).mockResolvedValue({
            id: "ace-1",
            organizationId: "o1",
            resourceType: "source_document",
            resourceId: "doc-1",
            principalId: "legal-ou",
            permission: "read",
            effect: "allow",
            inheritable: true,
            createdBy: "u1",
            createdAt: now,
        });

        const r = await grantAccessService("u1", "o1", {
            resourceType: "source_document",
            resourceId: "doc-1",
            principalId: "legal-ou",
            permission: "read",
            effect: "allow",
            inheritable: true,
        });
        expect(r.ok).toBe(true);
        expect(insertAce).toHaveBeenCalledWith(
            expect.objectContaining({ createdBy: "u1", effect: "allow" }),
        );
    });
});
