import { Elysia } from "elysia";
import { z } from "zod";
import { microsoftDriveItemsSchema } from "@/core/microsoft/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listMicrosoftDriveItemsService } from "../../services/list-drive-items-service";

export const listMicrosoftDriveItemsRoute = new Elysia().use(authed).get(
    "/:organizationId/drives/:driveId/items",
    async ({ user, params, query, status }) => {
        const result = await listMicrosoftDriveItemsService(
            params.organizationId,
            user.id,
            params.driveId,
            query.folderId,
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
            driveId: z.string(),
        }),
        query: z.object({ folderId: z.string().optional() }),
        response: {
            200: successResponseSchema(
                microsoftDriveItemsSchema,
                "MicrosoftDriveItems",
            ),
            401: errorResponseSchema(401),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Microsoft"],
            summary: "List children of a drive root or folder",
        },
    },
);
