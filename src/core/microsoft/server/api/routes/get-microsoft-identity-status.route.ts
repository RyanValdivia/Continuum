import { Elysia } from "elysia";
import { z } from "zod";
import { microsoftIdentityStatusSchema } from "@/core/microsoft/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { getMicrosoftIdentityStatusService } from "../../services/get-microsoft-identity-status-service";

export const getMicrosoftIdentityStatusRoute = new Elysia().use(authed).get(
    "/:organizationId/identity/status",
    async ({ user, params, status }) => {
        const result = await getMicrosoftIdentityStatusService(
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
            200: successResponseSchema(
                microsoftIdentityStatusSchema,
                "MicrosoftIdentityStatus",
            ),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Microsoft"],
            summary: "Get the caller's own Microsoft link status in this org",
        },
    },
);
