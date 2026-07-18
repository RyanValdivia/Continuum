/** The subset of a knowledge search result the digest renders. `SearchResult`
 *  is structurally assignable to this, so services pass `search.data` directly. */
export interface DigestSource {
    nodes: { type: string; label: string; summary: string | null }[];
    chunks: { content: string }[];
}

const EMPTY_DIGEST =
    "(Aún no hay conocimiento capturado para este rol — genera el plan a partir del título del puesto.)";

/**
 * Flatten retrieved graph nodes + source chunks into a plain-text role digest,
 * the same shape the recruitment benchmark and chat agent feed to Gemini.
 */
export function buildRoleDigest(src: DigestSource): string {
    const nodes = src.nodes
        .map(
            (n) =>
                `- ${n.type}: ${n.label}${n.summary ? ` — ${n.summary}` : ""}`,
        )
        .join("\n");
    const chunks = src.chunks.map((c) => `- ${c.content}`).join("\n");

    const digest = [
        nodes && `Decisiones, procesos y conceptos del rol:\n${nodes}`,
        chunks && `\nExtractos de fuentes:\n${chunks}`,
    ]
        .filter(Boolean)
        .join("\n");

    return digest || EMPTY_DIGEST;
}
