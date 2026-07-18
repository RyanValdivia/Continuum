import { Elysia } from "elysia";
import { z } from "zod";
import {
    slackChannelSchema,
    toggleSlackChannelSchema,
} from "@/core/slack/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { toggleSlackChannelService } from "../../services/toggle-slack-channel-service";

export const toggleSlackChannelRoute = new Elysia().use(authed).patch(
    "/:organizationId/workspace/channels/:channelId",
    async ({ user, params, body, status }) => {
        const result = await toggleSlackChannelService(
            params.organizationId,
            user.id,
            params.channelId,
            body.isMonitored,
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
        body: toggleSlackChannelSchema,
        response: {
            200: successResponseSchema(slackChannelSchema, "SlackChannel"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Slack"],
            summary: "Toggle whether a channel is monitored (admin-only)",
        },
    },
);
