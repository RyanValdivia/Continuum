import { Elysia } from "elysia";
import { z } from "zod";
import { microsoftChannelsSchema } from "@/core/microsoft/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listMicrosoftChannelsService } from "../../services/list-channels-service";

export const listMicrosoftChannelsRoute = new Elysia().use(authed).get(
    "/:organizationId/teams/:teamId/channels",
    async ({ user, params, status }) => {
        const result = await listMicrosoftChannelsService(
            params.organizationId,
            user.id,
            params.teamId,
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
        params: z.object({
            organizationId: z.string(),
            teamId: z.string(),
        }),
        response: {
            200: successResponseSchema(
                microsoftChannelsSchema,
                "MicrosoftChannels",
            ),
            401: errorResponseSchema(401),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Microsoft"],
            summary: "List channels of a team",
        },
    },
);
