import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("../../repository/people", () => ({ findOrgMembers: vi.fn() }));
vi.mock("../../repository/vacancies", () => ({
    flipPersonNodeToVacancy: vi.fn(),
    findVacancyById: vi.fn(),
    insertVacancy: vi.fn(),
}));

import { getOrgMembership } from "@/server/auth/get-org-membership";
import type { VacancyRow } from "@/server/drizzle/schemas/recruitment-schema";
import { findOrgMembers } from "../../repository/people";
import {
    findVacancyById,
    flipPersonNodeToVacancy,
    insertVacancy,
} from "../../repository/vacancies";
import { offboardPersonService } from "../offboard-person-service";

const ORG = "org1";
const ADMIN = "admin-user";
const MEMBER = "m1";

const vacancyRow = (over: Partial<VacancyRow> = {}): VacancyRow => ({
    id: MEMBER,
    organizationId: ORG,
    title: "Backend Senior",
    benchmarkType: "person",
    manualDescription: null,
    publicToken: "t".repeat(64),
    status: "open",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

describe("offboardPersonService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "admin" });
        vi.mocked(findOrgMembers).mockResolvedValue([
            {
                memberId: MEMBER,
                name: "Ana",
                email: "ana@x.com",
                role: "member",
            },
        ]);
        vi.mocked(findVacancyById).mockResolvedValue(null);
        vi.mocked(insertVacancy).mockImplementation(
            async (row) => vacancyRow({ ...row, id: row.id ?? MEMBER }) as VacancyRow,
        );
    });

    it("flips the person node in place and creates the vacancy with the member id", async () => {
        const result = await offboardPersonService(ADMIN, ORG, MEMBER, {
            title: "Backend Senior",
        });

        expect(flipPersonNodeToVacancy).toHaveBeenCalledWith(
            ORG,
            MEMBER,
            "Backend Senior",
        );
        const inserted = vi.mocked(insertVacancy).mock.calls[0][0];
        expect(inserted.id).toBe(MEMBER);
        expect(inserted.benchmarkType).toBe("person");
        expect(inserted.manualDescription).toBeNull();
        expect(inserted.publicToken).toMatch(/^[0-9a-f]{64}$/);

        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data.id).toBe(MEMBER);
    });

    it("conflicts when the member already has a vacancy", async () => {
        vi.mocked(findVacancyById).mockResolvedValue(vacancyRow());
        const result = await offboardPersonService(ADMIN, ORG, MEMBER, {
            title: "X",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("CONFLICT");
        expect(insertVacancy).not.toHaveBeenCalled();
    });

    it("404s when the member is not in the org", async () => {
        vi.mocked(findOrgMembers).mockResolvedValue([]);
        const result = await offboardPersonService(ADMIN, ORG, "ghost", {
            title: "X",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.status).toBe(404);
    });
});
