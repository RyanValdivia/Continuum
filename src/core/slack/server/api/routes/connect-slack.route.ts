import { Elysia } from "elysia";
import { z } from "zod";
import { authed } from "@/server/auth/middleware/authed";
import {
    errorResponseSchema,
    errorToResponse,
} from "@/server/common/responses";
import { getSlackConnectUrlService } from "../../services/get-slack-connect-url-service";

export const connectSlackRoute = new Elysia().use(authed).get(
    "/:organizationId/connect",
    async ({ user, params, redirect, status }) => {
        const result = await getSlackConnectUrlService(
            params.organizationId,
            user.id,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 422 | 500,
                errorToResponse(result.error),
            );
        return redirect(result.data);
    },
    {
        authed: true,
        params: z.object({ organizationId: z.string() }),
        response: {
            403: errorResponseSchema(403),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Slack"],
            summary: "Redirect to Slack's Sign in with Slack consent screen",
        },
    },
);
