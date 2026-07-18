import { z } from "zod";

/** Slack's own inbound payload shape — not our wire contract, kept loose
 *  (`.passthrough()`-free but permissive) since we only read a few fields. */
export const slackEventPayloadSchema = z.union([
    z.object({
        type: z.literal("url_verification"),
        challenge: z.string(),
    }),
    z.object({
        type: z.literal("event_callback"),
        team_id: z.string(),
        event: z.object({
            type: z.string(),
            channel: z.string().optional(),
            user: z.string().optional(),
            bot_id: z.string().optional(),
            text: z.string().optional(),
            ts: z.string().optional(),
            thread_ts: z.string().optional(),
            subtype: z.string().optional(),
        }),
    }),
]);

export type SlackEventPayload = z.infer<typeof slackEventPayloadSchema>;
