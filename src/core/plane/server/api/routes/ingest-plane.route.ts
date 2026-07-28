import { Elysia } from "elysia";
import { z } from "zod";
import {
    ingestPlaneSchema,
    planeIngestResultSchema,
} from "@/core/plane/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { ingestPlaneService } from "../../services/ingest-plane-service";

export const ingestPlaneRoute = new Elysia().use(authed).post(
    "/:organizationId/ingest",
    async ({ user, params, body, status }) => {
        const result = await ingestPlaneService(
            params.organizationId,
            user.id,
            body,
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
        body: ingestPlaneSchema,
        response: {
            200: successResponseSchema(
                planeIngestResultSchema,
                "PlaneIngestResult",
            ),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Plane"],
            summary: "Ingest selected projects' issues into the knowledge graph",
        },
    },
);
