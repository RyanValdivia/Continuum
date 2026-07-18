import { Elysia } from "elysia";
import { z } from "zod";
import {
    ingestMicrosoftTeamsSchema,
    microsoftIngestResultSchema,
} from "@/core/microsoft/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { ingestMicrosoftTeamsChannelsService } from "../../services/ingest-teams-channels-service";

export const ingestMicrosoftTeamsRoute = new Elysia().use(authed).post(
    "/:organizationId/ingest/teams",
    async ({ user, params, body, status }) => {
        const result = await ingestMicrosoftTeamsChannelsService(
            params.organizationId,
            user.id,
            body,
        );
        if (!result.ok)
            return status(
                result.error.status as 401 | 403 | 404 | 422 | 500,
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
        body: ingestMicrosoftTeamsSchema,
        response: {
            200: successResponseSchema(
                microsoftIngestResultSchema,
                "MicrosoftIngestResult",
            ),
            400: errorResponseSchema(400),
            401: errorResponseSchema(401),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Microsoft"],
            summary: "Ingest selected Teams channels into the knowledge graph",
        },
    },
);
