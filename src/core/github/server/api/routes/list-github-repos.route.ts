import { Elysia } from "elysia";
import { z } from "zod";
import { githubReposSchema } from "@/core/github/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listGithubReposService } from "../../services/list-github-repos-service";

export const listGithubReposRoute = new Elysia().use(authed).get(
    "/:organizationId/repos",
    async ({ user, params, status }) => {
        const result = await listGithubReposService(
            params.organizationId,
            user.id,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 422 | 500,
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
            200: successResponseSchema(githubReposSchema, "GithubRepos"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["GitHub"],
            summary: "List repos the connection has access to",
        },
    },
);
