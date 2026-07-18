import { Elysia } from "elysia";
import { z } from "zod";
import { ServerConfig } from "@/config/server-config";
import { slackEventPayloadSchema } from "@/server/slack/event-payload";
import { verifySlackSignature } from "@/server/slack/verify-signature";
import { handleSlackEventService } from "../../services/handle-slack-event-service";

/**
 * Events API webhook. No `authed` guard — Slack calls this directly, signed
 * with `SLACK_SIGNING_SECRET` (verified against the *raw* body, so this route
 * reads it as text instead of letting Elysia auto-parse JSON). Responds 200
 * immediately after verifying + validating; ingestion runs after the
 * response is sent (fire-and-forget) since Slack requires a reply within 3s
 * and an embed + LLM-extraction call routinely takes longer than that.
 */
export const slackEventsRoute = new Elysia().post(
    "/events",
    async ({ body, headers, set }) => {
        if (!ServerConfig.slack.isWorkspaceConfigured) {
            set.status = 404;
            return { code: "NOT_FOUND", status: 404 };
        }

        const valid = verifySlackSignature({
            signingSecret: ServerConfig.slack.signingSecret as string,
            signature: headers["x-slack-signature"] ?? null,
            timestamp: headers["x-slack-request-timestamp"] ?? null,
            rawBody: body,
        });
        if (!valid) {
            set.status = 401;
            return { code: "UNAUTHORIZED", status: 401 };
        }

        let json: unknown;
        try {
            json = JSON.parse(body);
        } catch {
            set.status = 400;
            return { code: "INVALID_BODY", status: 400 };
        }

        const parsed = slackEventPayloadSchema.safeParse(json);
        if (!parsed.success) {
            set.status = 400;
            return { code: "INVALID_BODY", status: 400 };
        }

        if (parsed.data.type === "url_verification") {
            return { challenge: parsed.data.challenge };
        }

        void handleSlackEventService(parsed.data);
        return { ok: true };
    },
    {
        parse: "text",
        body: z.string(),
        detail: {
            tags: ["Slack"],
            summary: "Events API webhook Slack posts message events to",
        },
    },
);
