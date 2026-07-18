import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ServerConfig } from "@/config/server-config";

export const ROLE_MODEL = "gemini-2.5-flash";

export interface GenerateRoleLlmInput {
    title: string;
    /** Digest of the person's captured knowledge, or "" for a fresh role. */
    digest: string;
}

/** The role-drafting seam — tests inject a deterministic fake. */
export type GenerateRoleFn = (input: GenerateRoleLlmInput) => Promise<string>;

const SYSTEM_PROMPT = `You draft a concise, practical role description for a company role.
Write 120-220 words in plain prose (no markdown headings), covering: the mission
of the role, the core responsibilities, and the key skills/experience expected.
When a knowledge digest of the person who held the role is provided, ground the
description in it — reflect the real decisions, processes and domain they owned.
Answer in Spanish. Output only the description, no preamble.`;

const google = createGoogleGenerativeAI({ apiKey: ServerConfig.googleApiKey });

export const googleGenerateRole: GenerateRoleFn = async (input) => {
    const { text } = await generateText({
        model: google(ROLE_MODEL),
        system: SYSTEM_PROMPT,
        prompt: [
            `Role title: ${input.title}`,
            "",
            input.digest
                ? `=== KNOWLEDGE OF THE PERSON BEING REPLACED ===\n${input.digest}`
                : "(No captured knowledge — draft from the title and common expectations for this role.)",
        ].join("\n"),
    });
    return text.trim();
};
