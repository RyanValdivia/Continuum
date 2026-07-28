import { Elysia } from "elysia";
import { z } from "zod";
import { planeProjectsSchema } from "@/core/plane/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listPlaneProjectsService } from "../../services/list-plane-projects-service";

export const listPlaneProjectsRoute = new Elysia().use(authed).get(
    "/:organizationId/projects",
    async ({ user, params, status }) => {
        const result = await listPlaneProjectsService(
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
            200: successResponseSchema(planeProjectsSchema, "PlaneProjects"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Plane"],
            summary: "List projects visible to the Plane connection",
        },
    },
);
