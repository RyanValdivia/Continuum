import "server-only";
import type { OffboardInput, Vacancy } from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findOrgMembers } from "../repository/people";
import { toVacancy } from "../repository/utils";
import {
    findVacancyById,
    flipPersonNodeToVacancy,
    insertVacancy,
} from "../repository/vacancies";
import { generatePublicToken } from "./public-token";

/**
 * Mark a member as departed: their graph node becomes the vacancy for their
 * replacement (same id — the member id), preserving all knowledge and the
 * per-person agent. The Better Auth membership is NOT touched here.
 */
export async function offboardPersonService(
    userId: string,
    organizationId: string,
    memberId: string,
    input: OffboardInput,
): AsyncAppResult<Vacancy> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const members = await findOrgMembers(organizationId);
        if (!members.some((m) => m.memberId === memberId)) {
            return err(AppErrors.notFound({ targets: ["memberId"] }));
        }

        const existing = await findVacancyById(organizationId, memberId);
        if (existing) {
            return err(AppErrors.conflict({ targets: ["memberId"] }));
        }

        await flipPersonNodeToVacancy(organizationId, memberId, input.title);
        const row = await insertVacancy({
            id: memberId,
            organizationId,
            title: input.title,
            benchmarkType: "person",
            manualDescription: null,
            publicToken: generatePublicToken(),
            status: "open",
        });
        return ok(toVacancy(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
