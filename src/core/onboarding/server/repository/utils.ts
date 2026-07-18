import "server-only";
import type { OnboardingPlan } from "@/core/onboarding/domain/types";
import type { OnboardingPlanRow } from "@/server/drizzle/schemas/onboarding-schema";

export const toPlan = (row: OnboardingPlanRow): OnboardingPlan => ({
    id: row.id,
    organizationId: row.organizationId,
    newHireMemberId: row.newHireMemberId,
    roleTitle: row.roleTitle,
    benchmarkPersonId: row.benchmarkPersonId,
    benchmarkPersonName: row.benchmarkPersonName,
    vacancyId: row.vacancyId,
    days: row.days,
    completedTaskIds: row.completedTaskIds,
    createdAt: row.createdAt.toISOString(),
});
