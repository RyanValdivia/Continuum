export interface ChunkOptions {
    /** Max characters per chunk. */
    maxChars?: number;
    /** Characters carried between windows when hard-splitting an oversized block. */
    overlap?: number;
}

const DEFAULT_MAX_CHARS = 1200;
const DEFAULT_OVERLAP = 150;

/**
 * Split plain text into embed-sized chunks. Prefers paragraph boundaries
 * (blank lines), greedily packing paragraphs up to `maxChars`. A single
 * paragraph larger than `maxChars` is hard-split into overlapping windows so
 * retrieval keeps context across the cut. Pure + deterministic (no ids, no I/O).
 */
export function chunkText(input: string, options: ChunkOptions = {}): string[] {
    const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
    // When the caller omits overlap, derive one that can never exceed maxChars
    // (a small maxChars must not trip the explicit-overlap guard below).
    const overlap =
        options.overlap ?? Math.min(DEFAULT_OVERLAP, Math.floor(maxChars / 4));

    if (maxChars <= 0) throw new Error("chunkText: maxChars must be > 0");
    if (overlap < 0) throw new Error("chunkText: overlap must be >= 0");
    if (overlap >= maxChars)
        throw new Error("chunkText: overlap must be smaller than maxChars");

    const paragraphs = input
        .replace(/\r\n/g, "\n")
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    const chunks: string[] = [];
    let current = "";

    const flush = () => {
        if (current.length > 0) {
            chunks.push(current);
            current = "";
        }
    };

    for (const para of paragraphs) {
        if (para.length > maxChars) {
            flush();
            for (const window of hardSplit(para, maxChars, overlap)) {
                chunks.push(window);
            }
            continue;
        }

        if (current.length === 0) {
            current = para;
        } else if (current.length + 2 + para.length <= maxChars) {
            current = `${current}\n\n${para}`;
        } else {
            flush();
            current = para;
        }
    }
    flush();

    return chunks;
}

/** Slice an oversized block into `maxChars` windows advancing by `maxChars - overlap`. */
function hardSplit(text: string, maxChars: number, overlap: number): string[] {
    const step = maxChars - overlap;
    const windows: string[] = [];
    for (let start = 0; start < text.length; start += step) {
        const piece = text.slice(start, start + maxChars).trim();
        if (piece.length > 0) windows.push(piece);
        if (start + maxChars >= text.length) break;
    }
    return windows;
}
