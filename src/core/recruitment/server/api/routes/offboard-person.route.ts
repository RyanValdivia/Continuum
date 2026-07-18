import { Elysia } from "elysia";
import { z } from "zod";
import {
    offboardInputSchema,
    vacancySchema,
} from "@/core/recruitment/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    createdResponseSchema,
    errorResponseSchema,
    errorToResponse,
} from "@/server/common/responses";
import { offboardPersonService } from "../../services/offboard-person-service";

export const offboardPersonRoute = new Elysia().use(authed).post(
    "/people/:memberId/offboard",
    async ({ user, session, params, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await offboardPersonService(
            user.id,
            org.data,
            params.memberId,
            body,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 409 | 500,
                errorToResponse(result.error),
            );
        return status(201, CommonResponse.created({ response: result.data }));
    },
    {
        authed: true,
        params: z.object({ memberId: z.string() }),
        body: offboardInputSchema,
        response: {
            201: createdResponseSchema(vacancySchema, "Vacancy"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            409: errorResponseSchema(409),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "Mark a member as departed — their node becomes a vacancy",
        },
    },
);
