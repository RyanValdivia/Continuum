import type {
    OnboardingDay,
    OnboardingPlan,
    OnboardingPlanOutput,
    OnboardingPlanView,
    OnboardingProgress,
} from "./types";

/** Stamp stable, position-based ids onto the LLM draft so tasks are addressable. */
export function materializePlan(output: OnboardingPlanOutput): OnboardingDay[] {
    return output.days.map((day, d) => ({
        title: day.title,
        tasks: day.tasks.map((task, t) => ({ ...task, id: `d${d}t${t}` })),
    }));
}

function allTaskIds(days: OnboardingDay[]): Set<string> {
    return new Set(days.flatMap((day) => day.tasks.map((task) => task.id)));
}

/** Progress counts only completed ids that still exist in the plan. */
export function computeProgress(
    days: OnboardingDay[],
    completedTaskIds: string[],
): OnboardingProgress {
    const ids = allTaskIds(days);
    const total = ids.size;
    const done = completedTaskIds.filter((id) => ids.has(id)).length;
    return { done, total, isComplete: total > 0 && done === total };
}

/** Attach derived progress to a persisted plan for rendering. */
export function toPlanView(plan: OnboardingPlan): OnboardingPlanView {
    return {
        ...plan,
        progress: computeProgress(plan.days, plan.completedTaskIds),
    };
}

/** Flip one task's done-state — no-op for ids not present in the plan. */
export function toggleCompleted(
    days: OnboardingDay[],
    completedTaskIds: string[],
    taskId: string,
): string[] {
    if (!allTaskIds(days).has(taskId)) return completedTaskIds;
    return completedTaskIds.includes(taskId)
        ? completedTaskIds.filter((id) => id !== taskId)
        : [...completedTaskIds, taskId];
}
