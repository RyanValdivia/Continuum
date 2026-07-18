/**
 * Cited-source collection — pure. Maps the retrieved chunks to the distinct
 * source documents behind them (first-cited order) so the chat can render a
 * clickable "Fuentes" list alongside the grounded answer.
 */

export interface SourceDoc {
    id: string;
    title: string;
    url: string | null;
}

export interface CitedSource {
    title: string;
    url: string | null;
}

export function collectSources(
    chunks: { documentId: string }[],
    docsById: Map<string, SourceDoc>,
): CitedSource[] {
    const seen = new Set<string>();
    const sources: CitedSource[] = [];
    for (const { documentId } of chunks) {
        if (seen.has(documentId)) continue;
        const doc = docsById.get(documentId);
        if (!doc) continue;
        seen.add(documentId);
        sources.push({ title: doc.title, url: doc.url });
    }
    return sources;
}
