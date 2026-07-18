import { Elysia } from "elysia";
import { z } from "zod";
import { slackChannelsResponseSchema } from "@/core/slack/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listSlackChannelsService } from "../../services/list-slack-channels-service";

export const listSlackChannelsRoute = new Elysia().use(authed).get(
    "/:organizationId/workspace/channels",
    async ({ user, params, status }) => {
        const result = await listSlackChannelsService(
            params.organizationId,
            user.id,
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
        params: z.object({ organizationId: z.string() }),
        response: {
            200: successResponseSchema(
                slackChannelsResponseSchema,
                "SlackChannels",
            ),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Slack"],
            summary: "List the org's Slack channels (admin-only, refreshes from Slack)",
        },
    },
);
