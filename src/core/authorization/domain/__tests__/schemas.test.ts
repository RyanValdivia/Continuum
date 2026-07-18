import { describe, expect, it } from "vitest";
import {
    createPrincipalSchema,
    grantAccessSchema,
    principalSchema,
    setMembershipSchema,
    updatePrincipalSchema,
} from "../schemas";

describe("createPrincipalSchema", () => {
    it("accepts a group with no parent (root-level)", () => {
        const parsed = createPrincipalSchema.parse({
            type: "group",
            name: "Legal",
        });
        expect(parsed.parentId).toBeNull();
    });

    it("accepts an ou nested under a parent", () => {
        const parsed = createPrincipalSchema.parse({
            type: "ou",
            name: "Backend",
            parentId: "ou-engineering",
        });
        expect(parsed.parentId).toBe("ou-engineering");
    });

    it("rejects a person type — persons are auto-provisioned, never created here", () => {
        expect(
            createPrincipalSchema.safeParse({ type: "person", name: "x" })
                .success,
        ).toBe(false);
    });

    it("rejects an empty name", () => {
        expect(
            createPrincipalSchema.safeParse({ type: "group", name: "" })
                .success,
        ).toBe(false);
    });
});

describe("updatePrincipalSchema", () => {
    it("allows moving a principal to the root by setting parentId null", () => {
        const parsed = updatePrincipalSchema.parse({ parentId: null });
        expect(parsed.parentId).toBeNull();
    });

    it("allows a partial update with only a name change", () => {
        const parsed = updatePrincipalSchema.parse({ name: "Renamed" });
        expect(parsed.name).toBe("Renamed");
        expect(parsed.parentId).toBeUndefined();
    });
});

describe("grantAccessSchema", () => {
    it("defaults permission to read, effect to allow, inheritable to true", () => {
        const parsed = grantAccessSchema.parse({
            resourceType: "source_document",
            resourceId: "doc-1",
            principalId: "p-1",
        });
        expect(parsed.permission).toBe("read");
        expect(parsed.effect).toBe("allow");
        expect(parsed.inheritable).toBe(true);
    });

    it("accepts an explicit deny grant", () => {
        const parsed = grantAccessSchema.parse({
            resourceType: "knowledge_node",
            resourceId: "node-1",
            principalId: "group-1",
            effect: "deny",
        });
        expect(parsed.effect).toBe("deny");
    });

    it("rejects an empty resourceId", () => {
        expect(
            grantAccessSchema.safeParse({
                resourceType: "ou",
                resourceId: "",
                principalId: "p-1",
            }).success,
        ).toBe(false);
    });
});

describe("setMembershipSchema", () => {
    it("requires both memberId and groupId", () => {
        expect(
            setMembershipSchema.safeParse({ memberId: "p-1" }).success,
        ).toBe(false);
        expect(
            setMembershipSchema.safeParse({ memberId: "p-1", groupId: "g-1" })
                .success,
        ).toBe(true);
    });
});

describe("principalSchema", () => {
    it("accepts a person principal with a nullable parentId", () => {
        const ok = principalSchema.safeParse({
            id: "pr-1",
            organizationId: "org-1",
            type: "person",
            name: "Ada Lovelace",
            description: null,
            userId: "user-1",
            parentId: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        });
        expect(ok.success).toBe(true);
    });
});
