import { Elysia } from "elysia";
import { z } from "zod";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { disconnectMicrosoftIdentityService } from "../../services/disconnect-microsoft-identity-service";

export const disconnectMicrosoftIdentityRoute = new Elysia().use(authed).delete(
    "/:organizationId/identity",
    async ({ user, params, status }) => {
        const result = await disconnectMicrosoftIdentityService(
            params.organizationId,
            user.id,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 500,
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
            200: successResponseSchema(
                z.object({ id: z.string() }),
                "DisconnectMicrosoftIdentity",
            ),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Microsoft"],
            summary: "Unlink the caller's own Microsoft account from this org",
        },
    },
);
