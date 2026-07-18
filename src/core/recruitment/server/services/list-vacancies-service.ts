import "server-only";
import type { VacancyListItem } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { toVacancy } from "../repository/utils";
import { listVacancies } from "../repository/vacancies";

export async function listVacanciesService(
    userId: string,
    organizationId: string,
): AsyncAppResult<VacancyListItem[]> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const rows = await listVacancies(organizationId);
        return ok(
            rows.map((row) => ({
                ...toVacancy(row),
                candidateCount: row.candidateCount,
            })),
        );
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
