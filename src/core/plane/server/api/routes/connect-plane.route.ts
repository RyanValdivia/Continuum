import { Elysia } from "elysia";
import { z } from "zod";
import { connectPlaneSchema, planeConnectionSchema } from "@/core/plane/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { connectPlaneService } from "../../services/connect-plane-service";

/** No OAuth for Plane — the admin pastes a workspace URL + API key generated
 *  in Plane's settings, so this is a plain POST instead of a redirect flow. */
export const connectPlaneRoute = new Elysia().use(authed).post(
    "/:organizationId/connect",
    async ({ user, params, body, status }) => {
        const result = await connectPlaneService(
            params.organizationId,
            user.id,
            body,
        );
        if (!result.ok)
            return status(
                result.error.status as 400 | 403 | 422 | 500,
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
        body: connectPlaneSchema,
        response: {
            200: successResponseSchema(planeConnectionSchema, "PlaneConnection"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Plane"],
            summary: "Connect the org's Plane workspace via API key",
        },
    },
);
