import type { SearchResult } from "@/core/knowledge/domain/types";
import type { SourceDoc } from "./sources";

/**
 * Minimal shape of an AI SDK UI message we read on the server: a role plus text
 * parts. We only need the latest user turn's text to drive retrieval.
 */
export interface UiMessageLike {
    role: string;
    parts?: Array<{ type: string; text?: string }>;
}

/** Concatenated text of the most recent user message; "" if none. */
export function latestUserText(messages: UiMessageLike[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.role !== "user") continue;
        return (message.parts ?? [])
            .filter((p) => p.type === "text" && p.text)
            .map((p) => p.text)
            .join(" ")
            .trim();
    }
    return "";
}

/**
 * Build the retrieval-augmented system prompt from a knowledge search result.
 * The chunks become numbered, citable sources; the nodes become a structured
 * "what this person decided / how they work" digest. Pure + deterministic so it
 * is unit-tested without a model.
 */
export function buildSystemPrompt(
    result: SearchResult,
    docsById?: Map<string, SourceDoc>,
): string {
    const sources = result.chunks
        .map((c, i) => {
            const label =
                docsById?.get(c.documentId)?.title ?? `doc ${c.documentId}`;
            return `[${i + 1}] (${label}) ${c.content}`;
        })
        .join("\n\n");

    const knowledge = result.nodes
        .map(
            (n) =>
                `- ${n.type}: ${n.label}${n.summary ? ` — ${n.summary}` : ""}`,
        )
        .join("\n");

    return [
        "You are Continuum — the living memory of an organization. You answer as the",
        "captured knowledge of a person/team, so a successor can keep working.",
        "",
        "Rules:",
        "- Answer ONLY from the retrieved context below. Do not invent facts.",
        "- Cite sources inline with their bracket number, e.g. [1], [2].",
        "- If the context does not contain the answer, say so plainly and suggest what to capture next.",
        "- Reply in the same language as the user's question. Be concise and concrete.",
        "",
        sources.length > 0
            ? `Retrieved sources:\n${sources}`
            : "Retrieved sources: (none)",
        "",
        knowledge.length > 0
            ? `Structured knowledge (decisions, processes, concepts):\n${knowledge}`
            : "Structured knowledge: (none)",
    ].join("\n");
}
