import { Elysia } from "elysia";
import { z } from "zod";
import { microsoftTeamsSchema } from "@/core/microsoft/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listMicrosoftTeamsService } from "../../services/list-teams-service";

export const listMicrosoftTeamsRoute = new Elysia().use(authed).get(
    "/:organizationId/teams",
    async ({ user, params, status }) => {
        const result = await listMicrosoftTeamsService(
            params.organizationId,
            user.id,
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
        response: {
            200: successResponseSchema(microsoftTeamsSchema, "MicrosoftTeams"),
            401: errorResponseSchema(401),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Microsoft"],
            summary: "List teams the connecting user belongs to",
        },
    },
);
