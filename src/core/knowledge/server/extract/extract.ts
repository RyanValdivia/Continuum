import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { ServerConfig } from "@/config/server-config";
import { extractedGraphSchema } from "@/core/knowledge/domain/schemas";
import type { ExtractedGraph } from "@/core/knowledge/domain/types";

export const EXTRACTION_MODEL = "gemini-2.5-flash";

/** Max characters of source text sent to the extractor per call. */
const MAX_EXTRACT_CHARS = 30_000;

/**
 * The extraction seam: turn a document into graph nodes + edges. Services depend
 * on this type, not the model — tests inject a deterministic fake, prod uses
 * {@link googleExtract}.
 */
export type ExtractFn = (text: string) => Promise<ExtractedGraph>;

const SYSTEM_PROMPT = `You build an organizational knowledge graph from one person's work document.
Extract the durable, transferable knowledge a successor would need — not surface facts.

Nodes:
- decision: a choice made and why it was made (criterion, tradeoff).
- process: how something is actually done, a repeatable procedure.
- concept: a domain idea, system, or entity the work revolves around.
- document: the source artifact itself, only when it is a distinct referenceable unit.

Edges connect nodes by tempId: relates_to, part_of, references, depends_on, caused_by.

Rules:
- Prefer few high-signal nodes over many trivial ones.
- Every edge's "from" and "to" MUST be a tempId you defined in nodes.
- A label is a short noun phrase; a summary captures the "why"/criterion in 1-2 sentences.
- If the text holds no transferable knowledge, return empty arrays.`;

const google = createGoogleGenerativeAI({ apiKey: ServerConfig.googleApiKey });

export const googleExtract: ExtractFn = async (text) => {
    const { output } = await generateText({
        model: google(EXTRACTION_MODEL),
        output: Output.object({ schema: extractedGraphSchema }),
        system: SYSTEM_PROMPT,
        prompt: text.slice(0, MAX_EXTRACT_CHARS),
    });
    return output;
};
