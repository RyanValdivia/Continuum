import "server-only";
import type {
    CreateManualVacancyInput,
    Vacancy,
} from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { toVacancy } from "../repository/utils";
import { insertVacancy, insertVacancyNode } from "../repository/vacancies";
import { generatePublicToken } from "./public-token";

/** A vacancy with no reference person — the manual description is the benchmark. */
export async function createManualVacancyService(
    userId: string,
    organizationId: string,
    input: CreateManualVacancyInput,
): AsyncAppResult<Vacancy> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const id = crypto.randomUUID();
        await insertVacancyNode(organizationId, id, input.title);
        const row = await insertVacancy({
            id,
            organizationId,
            title: input.title,
            benchmarkType: "manual",
            manualDescription: input.description,
            publicToken: generatePublicToken(),
            status: "open",
        });
        return ok(toVacancy(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
