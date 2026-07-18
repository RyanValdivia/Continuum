import "server-only";
import type { EmbedFn } from "@/core/knowledge/server/embeddings/embed";
import { searchKnowledgeService } from "@/core/knowledge/server/services/search-knowledge-service";
import { materializePlan, toPlanView } from "@/core/onboarding/domain/plan";
import type {
    CreateOnboardingInput,
    OnboardingPlanView,
} from "@/core/onboarding/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { buildRoleDigest } from "../digest";
import {
    type GenerateOnboardingFn,
    googleGenerateOnboarding,
} from "../llm/generate-plan";
import { insertPlan } from "../repository/plans";
import { toPlan } from "../repository/utils";

export interface GenerateDeps {
    generate?: GenerateOnboardingFn;
    embed?: EmbedFn;
}

/**
 * Build the role digest from the predecessor's captured knowledge, ask Gemini
 * for a day-by-day plan, stamp task ids, and persist it under the current
 * member. The same seam the hire flow calls when a candidate is contratado.
 */
export async function generateOnboardingPlanService(
    userId: string,
    organizationId: string,
    input: CreateOnboardingInput,
    deps: GenerateDeps = {},
): AsyncAppResult<OnboardingPlanView> {
    const generate = deps.generate ?? googleGenerateOnboarding;

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const search = await searchKnowledgeService(
            organizationId,
            {
                query: input.roleTitle,
                personId: input.benchmarkPersonId ?? undefined,
                limit: 12,
                hops: 1,
            },
            { embed: deps.embed },
        );
        if (!search.ok) return err(search.error);

        const digest = buildRoleDigest(search.data);

        let output: Awaited<ReturnType<GenerateOnboardingFn>>;
        try {
            output = await generate({
                roleTitle: input.roleTitle,
                benchmarkPersonName: input.benchmarkPersonName ?? null,
                digest,
            });
        } catch (cause) {
            return err(AppErrors.unexpected(cause));
        }

        const row = await insertPlan({
            organizationId,
            newHireMemberId: userId,
            roleTitle: input.roleTitle,
            benchmarkPersonId: input.benchmarkPersonId ?? null,
            benchmarkPersonName: input.benchmarkPersonName ?? null,
            vacancyId: input.vacancyId ?? null,
            days: materializePlan(output),
            completedTaskIds: [],
        });

        return ok(toPlanView(toPlan(row)));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
