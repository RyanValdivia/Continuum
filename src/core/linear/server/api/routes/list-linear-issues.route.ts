import { Elysia } from "elysia";
import { z } from "zod";
import { linearIssuesSchema } from "@/core/linear/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listLinearIssuesService } from "../../services/list-linear-issues-service";

export const listLinearIssuesRoute = new Elysia().use(authed).get(
    "/:organizationId/issues",
    async ({ user, params, status }) => {
        const result = await listLinearIssuesService(
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
            200: successResponseSchema(linearIssuesSchema, "LinearIssues"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Linear"],
            summary: "List open issues visible to the Linear connection",
        },
    },
);
