import "server-only";
import { getLogger } from "@logtape/logtape";
import type { SlackEventPayload } from "@/server/slack/event-payload";
import { findMonitoredChannelBySlackId } from "../repository/find-slack-channels";
import { ingestSlackMessage } from "./ingest-slack-message";

const logger = getLogger(["server", "slack", "events"]);

/**
 * Processes one `event_callback` payload from the Events API webhook. Called
 * fire-and-forget from the route (Slack needs a 200 within 3s, well under
 * what an embed + LLM-extraction ingestion call takes) — errors are logged,
 * never thrown, since there's no caller left to receive them by the time
 * this runs.
 */
export async function handleSlackEventService(
    payload: SlackEventPayload,
): Promise<void> {
    if (payload.type !== "event_callback") return;
    const { event } = payload;

    if (event.type !== "message") return;
    if (event.subtype || event.bot_id) return; // edits, joins, bot echoes, etc.
    if (!event.channel || !event.text || !event.ts) return;

    try {
        // Opt-in check: even if the bot technically received this event,
        // only ingest from channels the admin explicitly monitors.
        const channel = await findMonitoredChannelBySlackId(event.channel);
        if (!channel) return;

        await ingestSlackMessage({
            organizationId: channel.organizationId,
            message: {
                userId: event.user ?? null,
                text: event.text,
                ts: event.ts,
                threadTs: event.thread_ts ?? null,
            },
        });
    } catch (cause) {
        logger.error("Failed to handle Slack message event: {cause}", {
            cause,
        });
    }
}
