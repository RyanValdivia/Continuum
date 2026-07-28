import { Elysia } from "elysia";
import { z } from "zod";
import { linearStatusSchema } from "@/core/linear/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { getLinearStatusService } from "../../services/get-linear-status-service";

export const getLinearStatusRoute = new Elysia().use(authed).get(
    "/:organizationId/status",
    async ({ user, params, status }) => {
        const result = await getLinearStatusService(
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
            200: successResponseSchema(linearStatusSchema, "LinearStatus"),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Linear"],
            summary: "Get the org's Linear connection status",
        },
    },
);
