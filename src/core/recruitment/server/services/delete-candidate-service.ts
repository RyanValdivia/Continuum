import "server-only";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    deleteCandidate,
    findCandidateWithVacancy,
} from "../repository/candidates";

/** Hard delete for privacy requests — the analysis cascades. */
export async function deleteCandidateService(
    userId: string,
    organizationId: string,
    candidateId: string,
): AsyncAppResult<{ deleted: true }> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const found = await findCandidateWithVacancy(candidateId);
        if (!found || found.vacancy.organizationId !== organizationId) {
            return err(AppErrors.notFound({ targets: ["id"] }));
        }
        await deleteCandidate(candidateId);
        return ok({ deleted: true });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
