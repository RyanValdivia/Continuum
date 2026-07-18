import "server-only";
import { toPlanView } from "@/core/onboarding/domain/plan";
import type { OnboardingPlanView } from "@/core/onboarding/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findLatestPlanByMember } from "../repository/plans";
import { toPlan } from "../repository/utils";

/** The current member's onboarding journey (null when they have none yet). */
export async function getMyOnboardingService(
    userId: string,
    organizationId: string,
): AsyncAppResult<OnboardingPlanView | null> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const row = await findLatestPlanByMember(organizationId, userId);
        return ok(row ? toPlanView(toPlan(row)) : null);
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
