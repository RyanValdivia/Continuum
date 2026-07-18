import "server-only";
import type { RankedCandidate } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { listCandidatesWithAnalysis } from "../repository/candidates";
import { toAnalysis, toCandidate } from "../repository/utils";
import { findVacancyById } from "../repository/vacancies";

export async function listCandidatesService(
    userId: string,
    organizationId: string,
    vacancyId: string,
): AsyncAppResult<RankedCandidate[]> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const vacancy = await findVacancyById(organizationId, vacancyId);
        if (!vacancy) return err(AppErrors.notFound({ targets: ["id"] }));

        const rows = await listCandidatesWithAnalysis(vacancyId);
        return ok(
            rows.map(({ candidate, analysis }) => ({
                candidate: toCandidate(candidate),
                analysis: analysis ? toAnalysis(analysis) : null,
            })),
        );
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
