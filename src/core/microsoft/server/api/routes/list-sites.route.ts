import { Elysia } from "elysia";
import { z } from "zod";
import { microsoftSitesSchema } from "@/core/microsoft/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listMicrosoftSitesService } from "../../services/list-sites-service";

export const listMicrosoftSitesRoute = new Elysia().use(authed).get(
    "/:organizationId/sites",
    async ({ user, params, status }) => {
        const result = await listMicrosoftSitesService(
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
            200: successResponseSchema(microsoftSitesSchema, "MicrosoftSites"),
            401: errorResponseSchema(401),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Microsoft"],
            summary: "List browsable drives (SharePoint sites + OneDrive)",
        },
    },
);
