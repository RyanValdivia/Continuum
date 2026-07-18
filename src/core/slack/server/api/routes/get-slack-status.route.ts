import { Elysia } from "elysia";
import { z } from "zod";
import { slackStatusSchema } from "@/core/slack/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { getSlackStatusService } from "../../services/get-slack-status-service";

export const getSlackStatusRoute = new Elysia().use(authed).get(
    "/:organizationId/status",
    async ({ user, params, status }) => {
        const result = await getSlackStatusService(
            params.organizationId,
            user.id,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 500,
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
            200: successResponseSchema(slackStatusSchema, "SlackStatus"),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Slack"],
            summary: "Get the caller's own Slack link status in this org",
        },
    },
);
