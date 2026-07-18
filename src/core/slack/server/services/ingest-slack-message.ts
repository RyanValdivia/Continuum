import "server-only";
import { ingestDocumentService } from "@/core/knowledge/server/services/ingest-document-service";
import type { SlackMessage } from "@/server/slack/slack-api";
import { resolveSlackAuthor } from "./resolve-slack-author";

/** Below this many characters a message is almost never a decision — "ok",
 *  "+1", "lol" — not worth an embedding + LLM extraction call. Cheap noise
 *  filter; no stateful thread-buffering (that's a real follow-up, not MVP). */
const MIN_MESSAGE_CHARS = 30;

export type IngestSlackMessageResult =
    | { ingested: true }
    | { ingested: false; reason: "too_short" | "empty" | "failed" };

/**
 * Shared by the manual backfill and the Events API webhook: resolve the
 * author's Continuum identity (falls back to unattributed — never blocks
 * ingestion) and hand the message to the source-agnostic `ingestDocumentService`.
 */
export async function ingestSlackMessage(params: {
    organizationId: string;
    message: SlackMessage;
}): Promise<IngestSlackMessageResult> {
    const text = params.message.text.trim();
    if (!text) return { ingested: false, reason: "empty" };
    if (text.length < MIN_MESSAGE_CHARS) {
        return { ingested: false, reason: "too_short" };
    }

    const personId = params.message.userId
        ? await resolveSlackAuthor(
              params.organizationId,
              params.message.userId,
          )
        : null;

    const result = await ingestDocumentService(params.organizationId, {
        connector: "slack",
        externalId: params.message.ts,
        title: `Slack message ${params.message.ts}`,
        content: text,
        personId: personId ?? undefined,
        extract: true,
    });

    return result.ok
        ? { ingested: true }
        : { ingested: false, reason: "failed" };
}
