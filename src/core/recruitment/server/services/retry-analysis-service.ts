import "server-only";
import type { Analysis } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import { AppErrors, type AsyncAppResult, err } from "@/server/common/responses";
import { findCandidateWithVacancy } from "../repository/candidates";
import {
    type AnalyzeDeps,
    analyzeCandidateService,
} from "./analyze-candidate-service";

/** Admin re-run of a failed (or stale) analysis, org-scoped. */
export async function retryAnalysisService(
    userId: string,
    organizationId: string,
    candidateId: string,
    deps: AnalyzeDeps = {},
): AsyncAppResult<Analysis> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const found = await findCandidateWithVacancy(candidateId);
        if (!found || found.vacancy.organizationId !== organizationId) {
            return err(AppErrors.notFound({ targets: ["id"] }));
        }
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }

    return analyzeCandidateService(candidateId, deps);
}
