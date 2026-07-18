import { Elysia } from "elysia";
import { z } from "zod";
import { slackWorkspaceStatusSchema } from "@/core/slack/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { getSlackWorkspaceStatusService } from "../../services/get-slack-workspace-status-service";

export const getSlackWorkspaceStatusRoute = new Elysia().use(authed).get(
    "/:organizationId/workspace/status",
    async ({ user, params, status }) => {
        const result = await getSlackWorkspaceStatusService(
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
            200: successResponseSchema(
                slackWorkspaceStatusSchema,
                "SlackWorkspaceStatus",
            ),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Slack"],
            summary: "Get the org's Slack bot install status",
        },
    },
);
