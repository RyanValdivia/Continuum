import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { OnboardingDay } from "@/core/onboarding/domain/types";
import { organization } from "./organization-schema";

/**
 * A new hire's onboarding journey. The plan itself is denormalized `jsonb`
 * (days → tasks); progress is a flat array of completed task ids toggled in
 * place. `benchmarkPersonId` scopes every `talk` task to one person's agent —
 * it is the predecessor's org member id (the personId the graph attributes to).
 */
export const onboardingPlan = pgTable(
    "onboarding_plan",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        newHireMemberId: text("new_hire_member_id").notNull(),
        roleTitle: text("role_title").notNull(),
        benchmarkPersonId: text("benchmark_person_id"),
        benchmarkPersonName: text("benchmark_person_name"),
        vacancyId: text("vacancy_id"),
        days: jsonb("days").$type<OnboardingDay[]>().notNull(),
        completedTaskIds: jsonb("completed_task_ids")
            .$type<string[]>()
            .notNull()
            .default([]),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("onboarding_plan_org_member_idx").on(
            table.organizationId,
            table.newHireMemberId,
        ),
    ],
);

export type OnboardingPlanRow = typeof onboardingPlan.$inferSelect;
export type NewOnboardingPlanRow = typeof onboardingPlan.$inferInsert;
