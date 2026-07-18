/**
 * Plain-text rendering of Teams channel messages for knowledge ingestion.
 * Pure + deterministic (no I/O) so it is unit-tested.
 */

export interface TranscriptMessage {
    id: string;
    authorId: string | null;
    authorName: string;
    createdDateTime: string;
    /** Raw body — Teams returns HTML by default. */
    body: string;
    replyToId: string | null;
}

const HTML_ENTITIES: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
};

/** Convert Teams' simple message HTML to readable plain text. */
export function stripHtml(html: string): string {
    let text = html.replace(
        /<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?>/gi,
        "\n",
    );
    text = text.replace(/<li\s*>/gi, "- ");
    text = text.replace(/<[^>]+>/g, "");
    for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
        text = text.split(entity).join(char);
    }
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n");
}

function authorLabel(
    m: TranscriptMessage,
    emails: Map<string, string | null>,
): string {
    const email = m.authorId ? emails.get(m.authorId) : null;
    return email ? `${m.authorName} <${email}>` : m.authorName;
}

function headerLine(
    m: TranscriptMessage,
    emails: Map<string, string | null>,
): string {
    const timestamp = m.createdDateTime.replace("T", " ").slice(0, 16);
    const suffix = m.replyToId ? " (reply)" : "";
    return `${authorLabel(m, emails)} — ${timestamp}${suffix}`;
}

/**
 * Render messages (already chronological) as one transcript document, one
 * block per message: `Author <email> — YYYY-MM-DD HH:mm` over the plain-text
 * body. `emails` maps author ids to their resolved email (or null).
 */
export function renderTranscript(
    messages: TranscriptMessage[],
    emails: Map<string, string | null>,
): string {
    return messages
        .map((m) => `${headerLine(m, emails)}\n${stripHtml(m.body)}`)
        .join("\n\n");
}

export interface AuthorGroup<T extends TranscriptMessage> {
    authorId: string | null;
    authorName: string;
    messages: T[];
}

/**
 * Bucket messages by author (id when known, else display name) keeping each
 * bucket chronological. Authors below `minMessages` are dropped — a per-user
 * knowledge doc isn't worth it for a drive-by comment.
 */
export function groupMessagesByAuthor<T extends TranscriptMessage>(
    messages: T[],
    minMessages: number,
): AuthorGroup<T>[] {
    const buckets = new Map<string, AuthorGroup<T>>();
    for (const m of messages) {
        const key = m.authorId ?? m.authorName;
        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = {
                authorId: m.authorId,
                authorName: m.authorName,
                messages: [],
            };
            buckets.set(key, bucket);
        }
        bucket.messages.push(m);
    }
    return [...buckets.values()].filter(
        (b) => b.messages.length >= minMessages,
    );
}
