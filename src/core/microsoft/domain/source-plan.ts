/**
 * Ingestion planning for SharePoint/OneDrive drive items: which files we can
 * turn into text and how they map to stable `source_documents.externalId`s.
 * Pure + deterministic (no I/O) so it is unit-tested.
 */

/** Hard cap below `ingestDocumentSchema`'s 500k-char content limit. */
export const MAX_CONTENT_CHARS = 480_000;

const TEXT_EXTENSIONS = ["txt", "md", "csv", "json", "xml", "html", "htm"];
const OFFICE_EXTENSIONS = ["docx", "pptx", "xlsx"];

function extensionOf(name: string): string | null {
    const dot = name.lastIndexOf(".");
    if (dot < 0 || dot === name.length - 1) return null;
    return name.slice(dot + 1).toLowerCase();
}

export type DriveItemKind = "text" | "office";

/**
 * How a drive item can be ingested: `"text"` downloads raw content,
 * `"office"` goes through Graph's `?format=pdf` conversion + PDF text
 * extraction. `null` = unsupported, the file is skipped.
 */
export function classifyDriveItem(
    name: string,
    mimeType: string | null,
): DriveItemKind | null {
    const ext = extensionOf(name);
    if (ext && TEXT_EXTENSIONS.includes(ext)) return "text";
    if (ext && OFFICE_EXTENSIONS.includes(ext)) return "office";
    if (mimeType?.startsWith("text/")) return "text";
    if (mimeType?.includes("officedocument")) return "office";
    return null;
}

export function truncateContent(content: string): string {
    return content.slice(0, MAX_CONTENT_CHARS);
}

export function spExternalId(driveId: string, itemId: string): string {
    return `sp:${driveId}:${itemId}`;
}

export function teamsChannelExternalId(
    teamId: string,
    channelId: string,
    sinceDays: number,
): string {
    return `teams:${teamId}:${channelId}:w${sinceDays}`;
}

export function teamsUserExternalId(
    teamId: string,
    channelId: string,
    sinceDays: number,
    authorKey: string,
): string {
    return `teams:${teamId}:${channelId}:w${sinceDays}:user:${authorKey}`;
}
