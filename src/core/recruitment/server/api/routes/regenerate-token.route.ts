import { Elysia } from "elysia";
import { z } from "zod";
import { vacancySchema } from "@/core/recruitment/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { regenerateTokenService } from "../../services/regenerate-token-service";

export const regenerateTokenRoute = new Elysia().use(authed).post(
    "/vacancies/:id/regenerate-token",
    async ({ user, session, params, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await regenerateTokenService(
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
            200: successResponseSchema(vacancySchema, "Vacancy"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "Rotate the public apply link",
        },
    },
);
