import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { ServerConfig } from "@/config/server-config";
import { candidateProfileSchema } from "@/core/recruitment/domain/schemas";
import type { CandidateProfile } from "@/core/recruitment/domain/types";

export const CV_PARSE_MODEL = "gemini-2.5-flash";

/**
 * The CV-parse seam: turn a PDF into a structured profile. Services depend on
 * this type, not the model — tests inject a deterministic fake.
 */
export type ParseCvFn = (pdf: Uint8Array) => Promise<CandidateProfile>;

const SYSTEM_PROMPT = `You extract a structured profile from a candidate's CV (PDF attached).
- plainText: the full cleaned plain-text content of the CV (no layout artifacts).
- summary: 2-3 sentences on who this candidate is professionally.
- skills: concrete technologies/domains (not soft adjectives).
- yearsOfExperience: total professional years, or null if unclear.
- experience: each relevant job with role, company, and a 1-sentence summary.
Use the CV's own language.`;

const google = createGoogleGenerativeAI({ apiKey: ServerConfig.googleApiKey });

export const googleParseCv: ParseCvFn = async (pdf) => {
    const { output } = await generateText({
        model: google(CV_PARSE_MODEL),
        output: Output.object({ schema: candidateProfileSchema }),
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: SYSTEM_PROMPT },
                    { type: "file", data: pdf, mediaType: "application/pdf" },
                ],
            },
        ],
    });
    return output;
};
