import "server-only";
import type { EmbedFn } from "@/core/knowledge/server/embeddings/embed";
import { searchKnowledgeService } from "@/core/knowledge/server/services/search-knowledge-service";
import type {
    Analysis,
    AnalysisOutput,
} from "@/core/recruitment/domain/types";
import {
    AppErrors,
    type AppResult,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import type { VacancyRow } from "@/server/drizzle/schemas/recruitment-schema";
import {
    type AnalyzeBenchmarkFn,
    googleAnalyzeBenchmark,
} from "../llm/analyze";
import { upsertAnalysis } from "../repository/analyses";
import {
    findCandidateWithVacancy,
    setCandidateStatus,
} from "../repository/candidates";
import { toAnalysis } from "../repository/utils";

export interface AnalyzeDeps {
    analyze?: AnalyzeBenchmarkFn;
    embed?: EmbedFn;
}

/**
 * Build the role benchmark. Person-born vacancies digest the departed
 * person's knowledge via the existing hybrid retrieval — scoped to
 * `personId = vacancy.id` (the member id, preserved by the offboarding
 * flip). Manual vacancies use their description verbatim.
 */
async function buildBenchmark(
    vacancy: VacancyRow,
    deps: AnalyzeDeps,
): Promise<AppResult<string>> {
    if (vacancy.benchmarkType === "manual") {
        return ok(vacancy.manualDescription ?? "");
    }

    const search = await searchKnowledgeService(
        vacancy.organizationId,
        {
            query: vacancy.title,
            personId: vacancy.id,
            limit: 12,
            hops: 1,
        },
        { embed: deps.embed },
    );
    if (!search.ok) return err(search.error);

    const nodes = search.data.nodes
        .map(
            (n) =>
                `- ${n.type}: ${n.label}${n.summary ? ` — ${n.summary}` : ""}`,
        )
        .join("\n");
    const chunks = search.data.chunks.map((c) => `- ${c.content}`).join("\n");
    const digest = [
        nodes ? `Decisions, processes and concepts:\n${nodes}` : "",
        chunks ? `\nSource excerpts:\n${chunks}` : "",
    ]
        .filter(Boolean)
        .join("\n");

    return ok(
        digest ||
            "(No captured knowledge for this person yet — evaluate against the role title only.)",
    );
}

/**
 * Compare one candidate against the vacancy benchmark and persist the
 * analysis. Never loses the application: any failure marks the candidate
 * `failed` (HR can retry) instead of bubbling up to the public applicant.
 */
export async function analyzeCandidateService(
    candidateId: string,
    deps: AnalyzeDeps = {},
): AsyncAppResult<Analysis> {
    const analyze = deps.analyze ?? googleAnalyzeBenchmark;

    try {
        const found = await findCandidateWithVacancy(candidateId);
        if (!found) return err(AppErrors.notFound({ targets: ["id"] }));
        const { candidate, vacancy } = found;

        const benchmark = await buildBenchmark(vacancy, deps);
        if (!benchmark.ok) {
            await setCandidateStatus(candidate.id, "failed");
            return err(benchmark.error);
        }

        let output: AnalysisOutput;
        try {
            output = await analyze({
                vacancyTitle: vacancy.title,
                benchmark: benchmark.data,
                profile: candidate.profile,
            });
        } catch (cause) {
            await setCandidateStatus(candidate.id, "failed");
            return err(AppErrors.unexpected(cause));
        }

        const row = await upsertAnalysis({
            candidateId: candidate.id,
            score: output.score,
            dimensions: output.dimensions,
            summary: output.summary,
            interviewQuestions: output.interviewQuestions,
        });
        await setCandidateStatus(candidate.id, "analyzed");
        return ok(toAnalysis(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
