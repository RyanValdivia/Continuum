import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("@/core/knowledge/server/services/search-knowledge-service", () => ({
    searchKnowledgeService: vi.fn(),
}));

import { searchKnowledgeService } from "@/core/knowledge/server/services/search-knowledge-service";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import type { GenerateRoleFn } from "../../llm/generate-role";
import { generateRoleDescriptionService } from "../generate-role-description-service";

const ORG = "org1";
const ADMIN = "admin";

const searchOk = (
    nodes: { type: string; label: string; summary: string | null }[],
) => ({
    ok: true as const,
    data: { query: "q", chunks: [], nodes, edges: [] },
});

describe("generateRoleDescriptionService", () => {
    let generate: GenerateRoleFn & ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "owner" });
        generate = vi.fn(
            async ({ title, digest }) =>
                `Rol: ${title}${digest ? " [con contexto]" : ""}`,
        ) as never;
    });

    it("forbids non-admins", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "member" });
        const result = await generateRoleDescriptionService(
            ADMIN,
            ORG,
            { title: "Backend Senior" },
            { generate },
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(403);
    });

    it("drafts from the title alone when no person is given", async () => {
        const result = await generateRoleDescriptionService(
            ADMIN,
            ORG,
            { title: "Backend Senior" },
            { generate },
        );
        expect(searchKnowledgeService).not.toHaveBeenCalled();
        expect(generate).toHaveBeenCalledWith({
            title: "Backend Senior",
            digest: "",
        });
        expect(result.ok).toBe(true);
        if (result.ok)
            expect(result.data.description).toBe("Rol: Backend Senior");
    });

    it("digests the person's knowledge when a personId is given", async () => {
        vi.mocked(searchKnowledgeService).mockResolvedValue(
            searchOk([
                { type: "decision", label: "Facturación", summary: "mensual" },
            ]) as never,
        );
        const result = await generateRoleDescriptionService(
            ADMIN,
            ORG,
            { title: "Backend Senior", personId: "m1" },
            { generate },
        );
        expect(searchKnowledgeService).toHaveBeenCalled();
        const arg = generate.mock.calls[0][0];
        expect(arg.digest).toContain("Facturación");
        expect(result.ok).toBe(true);
        if (result.ok)
            expect(result.data.description).toBe(
                "Rol: Backend Senior [con contexto]",
            );
    });

    it("degrades to an empty digest when retrieval fails (never blocks drafting)", async () => {
        vi.mocked(searchKnowledgeService).mockResolvedValue({
            ok: false,
            error: { code: "INTERNAL_SERVER_ERROR", status: 500 },
        } as never);
        const result = await generateRoleDescriptionService(
            ADMIN,
            ORG,
            { title: "Backend Senior", personId: "m1" },
            { generate },
        );
        expect(generate).toHaveBeenCalledWith({
            title: "Backend Senior",
            digest: "",
        });
        expect(result.ok).toBe(true);
    });

    it("maps LLM failures to INTERNAL_SERVER_ERROR", async () => {
        generate.mockRejectedValue(new Error("llm down"));
        const result = await generateRoleDescriptionService(
            ADMIN,
            ORG,
            { title: "Backend Senior" },
            { generate },
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    });
});
