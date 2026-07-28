import { Elysia } from "elysia";
import { z } from "zod";
import { planeStatusSchema } from "@/core/plane/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { getPlaneStatusService } from "../../services/get-plane-status-service";

export const getPlaneStatusRoute = new Elysia().use(authed).get(
    "/:organizationId/status",
    async ({ user, params, status }) => {
        const result = await getPlaneStatusService(
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
            200: successResponseSchema(planeStatusSchema, "PlaneStatus"),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Plane"],
            summary: "Get the org's Plane connection status",
        },
    },
);
