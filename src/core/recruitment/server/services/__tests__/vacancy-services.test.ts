import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/get-org-membership", () => ({
    getOrgMembership: vi.fn(),
    ORG_ADMIN_ROLES: new Set(["owner", "admin"]),
}));
vi.mock("../../repository/vacancies", () => ({
    insertVacancyNode: vi.fn(),
    insertVacancy: vi.fn(),
    findVacancyById: vi.fn(),
    listVacancies: vi.fn(),
    setVacancyStatus: vi.fn(),
    setVacancyToken: vi.fn(),
}));

import { getOrgMembership } from "@/server/auth/get-org-membership";
import type { VacancyRow } from "@/server/drizzle/schemas/recruitment-schema";
import {
    findVacancyById,
    insertVacancy,
    insertVacancyNode,
    listVacancies,
    setVacancyStatus,
    setVacancyToken,
} from "../../repository/vacancies";
import { closeVacancyService } from "../close-vacancy-service";
import { createManualVacancyService } from "../create-manual-vacancy-service";
import { getVacancyService } from "../get-vacancy-service";
import { listVacanciesService } from "../list-vacancies-service";
import { regenerateTokenService } from "../regenerate-token-service";

const ORG = "org1";
const ADMIN = "admin-user";

const vacancyRow = (over: Partial<VacancyRow> = {}): VacancyRow => ({
    id: "v1",
    organizationId: ORG,
    title: "Data Analyst",
    benchmarkType: "manual",
    manualDescription: "SQL + dashboards",
    publicToken: "a".repeat(64),
    status: "open",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

describe("vacancy services", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getOrgMembership).mockResolvedValue({ role: "owner" });
        vi.mocked(insertVacancy).mockImplementation(async (row) =>
            vacancyRow(row as VacancyRow),
        );
        vi.mocked(findVacancyById).mockResolvedValue(vacancyRow());
        vi.mocked(listVacancies).mockResolvedValue([
            { ...vacancyRow(), candidateCount: 3 },
        ]);
        vi.mocked(setVacancyStatus).mockResolvedValue(
            vacancyRow({ status: "closed" }),
        );
        vi.mocked(setVacancyToken).mockResolvedValue(
            vacancyRow({ publicToken: "b".repeat(64) }),
        );
    });

    it("creates a manual vacancy with a graph node and generated token", async () => {
        const result = await createManualVacancyService(ADMIN, ORG, {
            title: "Data Analyst",
            description: "SQL + dashboards",
        });

        expect(insertVacancyNode).toHaveBeenCalledOnce();
        const [orgArg, idArg, titleArg] =
            vi.mocked(insertVacancyNode).mock.calls[0];
        expect(orgArg).toBe(ORG);
        expect(titleArg).toBe("Data Analyst");

        const inserted = vi.mocked(insertVacancy).mock.calls[0][0];
        expect(inserted.id).toBe(idArg); // vacancy id == node id
        expect(inserted.benchmarkType).toBe("manual");
        expect(inserted.manualDescription).toBe("SQL + dashboards");
        expect(inserted.publicToken).toMatch(/^[0-9a-f]{64}$/);
        expect(result.ok).toBe(true);
    });

    it("lists vacancies with candidate counts", async () => {
        const result = await listVacanciesService(ADMIN, ORG);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data[0].candidateCount).toBe(3);
            expect(result.data[0].title).toBe("Data Analyst");
        }
    });

    it("gets a vacancy or 404s", async () => {
        const found = await getVacancyService(ADMIN, ORG, "v1");
        expect(found.ok).toBe(true);

        vi.mocked(findVacancyById).mockResolvedValue(null);
        const missing = await getVacancyService(ADMIN, ORG, "ghost");
        expect(missing.ok).toBe(false);
        if (!missing.ok) expect(missing.error.status).toBe(404);
    });

    it("closes a vacancy and 404s on unknown id", async () => {
        const closed = await closeVacancyService(ADMIN, ORG, "v1");
        expect(closed.ok).toBe(true);
        if (closed.ok) expect(closed.data.status).toBe("closed");
        expect(setVacancyStatus).toHaveBeenCalledWith(ORG, "v1", "closed");

        vi.mocked(setVacancyStatus).mockResolvedValue(null);
        const missing = await closeVacancyService(ADMIN, ORG, "ghost");
        expect(missing.ok).toBe(false);
        if (!missing.ok) expect(missing.error.status).toBe(404);
    });

    it("regenerates the public token", async () => {
        const result = await regenerateTokenService(ADMIN, ORG, "v1");
        expect(result.ok).toBe(true);
        const [orgArg, idArg, tokenArg] =
            vi.mocked(setVacancyToken).mock.calls[0];
        expect(orgArg).toBe(ORG);
        expect(idArg).toBe("v1");
        expect(tokenArg).toMatch(/^[0-9a-f]{64}$/);
        expect(tokenArg).not.toBe("a".repeat(64));
    });
});
