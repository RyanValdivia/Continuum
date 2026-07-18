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
import { deleteCandidateService } from "../../services/delete-candidate-service";

const deleteResultSchema = z.object({ deleted: z.literal(true) });

export const deleteCandidateRoute = new Elysia().use(authed).delete(
    "/candidates/:id",
    async ({ user, session, params, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await deleteCandidateService(
            user.id,
            org.data,
            params.id,
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
        params: z.object({ id: z.string() }),
        response: {
            200: successResponseSchema(deleteResultSchema, "DeleteResult"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "Delete a candidate (privacy)",
        },
    },
);
