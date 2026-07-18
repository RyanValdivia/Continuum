import "server-only";
import { toggleCompleted, toPlanView } from "@/core/onboarding/domain/plan";
import type { OnboardingPlanView } from "@/core/onboarding/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findPlanById, setCompletedTaskIds } from "../repository/plans";
import { toPlan } from "../repository/utils";

/** Flip one task's done-state on the caller's own plan. */
export async function toggleTaskService(
    userId: string,
    organizationId: string,
    planId: string,
    taskId: string,
): AsyncAppResult<OnboardingPlanView> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await findPlanById(planId);
        if (!row || row.organizationId !== organizationId) {
            return err(AppErrors.notFound({ targets: ["id"] }));
        }
        if (row.newHireMemberId !== userId) return err(AppErrors.forbidden());

        const next = toggleCompleted(row.days, row.completedTaskIds, taskId);
        const updated = await setCompletedTaskIds(planId, next);
        return ok(toPlanView(toPlan(updated)));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
