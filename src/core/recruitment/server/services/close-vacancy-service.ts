import "server-only";
import type { Vacancy } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { toVacancy } from "../repository/utils";
import { setVacancyStatus } from "../repository/vacancies";

export async function closeVacancyService(
    userId: string,
    organizationId: string,
    id: string,
): AsyncAppResult<Vacancy> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const row = await setVacancyStatus(organizationId, id, "closed");
        if (!row) return err(AppErrors.notFound({ targets: ["id"] }));
        return ok(toVacancy(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
