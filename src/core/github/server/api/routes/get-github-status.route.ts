import { Elysia } from "elysia";
import { z } from "zod";
import { githubStatusSchema } from "@/core/github/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { getGithubStatusService } from "../../services/get-github-status-service";

export const getGithubStatusRoute = new Elysia().use(authed).get(
    "/:organizationId/status",
    async ({ user, params, status }) => {
        const result = await getGithubStatusService(
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
            200: successResponseSchema(githubStatusSchema, "GithubStatus"),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["GitHub"],
            summary: "Get the org's GitHub connection status",
        },
    },
);
