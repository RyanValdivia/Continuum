import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { ServerConfig } from "@/config/server-config";
import { analysisOutputSchema } from "@/core/recruitment/domain/schemas";
import type {
    AnalysisOutput,
    CandidateProfile,
} from "@/core/recruitment/domain/types";

export const ANALYSIS_MODEL = "gemini-2.5-flash";

export interface AnalyzeInput {
    vacancyTitle: string;
    /** The role benchmark: knowledge digest (person) or manual description. */
    benchmark: string;
    profile: CandidateProfile;
}

/** The analysis seam — tests inject a deterministic fake. */
export type AnalyzeBenchmarkFn = (
    input: AnalyzeInput,
) => Promise<AnalysisOutput>;

const SYSTEM_PROMPT = `You evaluate a candidate against the real benchmark of a role inside one company.
The benchmark is either the captured knowledge of the person who held the role
(their decisions, processes, concepts) or a manual role description.

Score the fit 0-100 and break it into 3-6 dimensions (e.g. processes, domain,
seniority of judgment). Each dimension: name, score 0-100, strengths, gaps —
always grounded in the benchmark vs the CV, never invented. Then a 2-3 sentence
summary and 5-8 interview questions that probe the gaps.
Answer in the language of the benchmark.`;

const google = createGoogleGenerativeAI({ apiKey: ServerConfig.googleApiKey });

export const googleAnalyzeBenchmark: AnalyzeBenchmarkFn = async (input) => {
    const { output } = await generateText({
        model: google(ANALYSIS_MODEL),
        output: Output.object({ schema: analysisOutputSchema }),
        system: SYSTEM_PROMPT,
        prompt: [
            `Role: ${input.vacancyTitle}`,
            "",
            "=== ROLE BENCHMARK ===",
            input.benchmark,
            "",
            "=== CANDIDATE PROFILE ===",
            `Summary: ${input.profile.summary}`,
            `Skills: ${input.profile.skills.join(", ")}`,
            `Years of experience: ${input.profile.yearsOfExperience ?? "unknown"}`,
            "",
            "=== CV TEXT ===",
            input.profile.plainText.slice(0, 20_000),
        ].join("\n"),
    });
    return output;
};
