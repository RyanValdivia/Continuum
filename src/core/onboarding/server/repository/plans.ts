import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type NewOnboardingPlanRow,
    type OnboardingPlanRow,
    onboardingPlan,
} from "@/server/drizzle/schemas/onboarding-schema";

export async function insertPlan(
    row: NewOnboardingPlanRow,
): Promise<OnboardingPlanRow> {
    const [inserted] = await db.insert(onboardingPlan).values(row).returning();
    return inserted;
}

/** The member's most recent plan (one journey shown at a time). */
export async function findLatestPlanByMember(
    organizationId: string,
    newHireMemberId: string,
): Promise<OnboardingPlanRow | null> {
    const [row] = await db
        .select()
        .from(onboardingPlan)
        .where(
            and(
                eq(onboardingPlan.organizationId, organizationId),
                eq(onboardingPlan.newHireMemberId, newHireMemberId),
            ),
        )
        .orderBy(desc(onboardingPlan.createdAt))
        .limit(1);
    return row ?? null;
}

export async function findPlanById(
    id: string,
): Promise<OnboardingPlanRow | null> {
    const [row] = await db
        .select()
        .from(onboardingPlan)
        .where(eq(onboardingPlan.id, id))
        .limit(1);
    return row ?? null;
}

export async function setCompletedTaskIds(
    id: string,
    completedTaskIds: string[],
): Promise<OnboardingPlanRow> {
    const [updated] = await db
        .update(onboardingPlan)
        .set({ completedTaskIds })
        .where(eq(onboardingPlan.id, id))
        .returning();
    return updated;
}
