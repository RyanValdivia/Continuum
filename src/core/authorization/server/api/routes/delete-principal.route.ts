import { Elysia } from "elysia";
import { z } from "zod";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { deletePrincipalService } from "../../services/delete-principal-service";

export const deletePrincipalRoute = new Elysia().use(authed).delete(
    "/:id",
    async ({ user, session, params, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await deletePrincipalService(user.id, org.data, params.id);
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: { id: params.id } }),
        );
    },
    {
        authed: true,
        params: z.object({ id: z.string() }),
        response: {
            200: successResponseSchema(
                z.object({ id: z.string() }),
                "DeletePrincipal",
            ),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Authorization"],
            summary: "Delete an OU or group",
            description: "Owner/admin only. Cascades to child principals, their memberships, and their ACEs.",
        },
    },
);
