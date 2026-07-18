import "server-only";
import type { OnboardingTarget } from "@/core/onboarding/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { listOrgMembers } from "../repository/members";

/** The org members a new hire can choose to step into (predecessor picker). */
export async function listOnboardingTargetsService(
    userId: string,
    organizationId: string,
): AsyncAppResult<OnboardingTarget[]> {
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const members = await listOrgMembers(organizationId);
        return ok(
            members.map((m) => ({
                personId: m.memberId,
                name: m.name,
                role: m.role,
            })),
        );
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
