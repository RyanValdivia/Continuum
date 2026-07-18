import { Elysia } from "elysia";
import { z } from "zod";
import { syncSlackChannelResultSchema } from "@/core/slack/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { syncSlackChannelService } from "../../services/sync-slack-channel-service";

export const syncSlackChannelRoute = new Elysia().use(authed).post(
    "/:organizationId/workspace/channels/:channelId/sync",
    async ({ user, params, status }) => {
        const result = await syncSlackChannelService(
            params.organizationId,
            user.id,
            params.channelId,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        params: z.object({ organizationId: z.string(), channelId: z.string() }),
        response: {
            200: successResponseSchema(
                syncSlackChannelResultSchema,
                "SyncSlackChannelResult",
            ),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Slack"],
            summary: "Manually backfill a channel's recent history (admin-only)",
            description:
                "One-shot pull via conversations.history — Slack rate-limits this endpoint, so it's not meant to be polled. Ongoing monitoring happens via the Events API webhook once the channel is joined.",
        },
    },
);
