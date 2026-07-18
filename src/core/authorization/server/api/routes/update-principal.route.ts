import { Elysia } from "elysia";
import { z } from "zod";
import {
    principalSchema,
    updatePrincipalSchema,
} from "@/core/authorization/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { updatePrincipalService } from "../../services/update-principal-service";

export const updatePrincipalRoute = new Elysia().use(authed).put(
    "/:id",
    async ({ user, session, params, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await updatePrincipalService(
            user.id,
            org.data,
            params.id,
            body,
        );
        if (!result.ok)
            return status(
                result.error.status as 400 | 403 | 404 | 409 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        params: z.object({ id: z.string() }),
        body: updatePrincipalSchema,
        response: {
            200: successResponseSchema(principalSchema, "Principal"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            409: errorResponseSchema(409),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Authorization"],
            summary: "Rename/move an OU or group",
            description: "Owner/admin only. Rejects a reparent that would create a cycle.",
        },
    },
);
