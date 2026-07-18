import "server-only";
import { extractText } from "unpdf";

/**
 * PDF bytes → plain text. In the Microsoft flow the PDFs come from Graph's
 * server-side Office→PDF conversion, so input is always a complete document.
 */
export async function extractPdfText(pdf: Uint8Array): Promise<string> {
    const { text } = await extractText(pdf);
    return Array.isArray(text) ? text.join("\n") : text;
}
