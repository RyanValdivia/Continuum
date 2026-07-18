import { Elysia } from "elysia";
import {
    createManualVacancySchema,
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
import { createManualVacancyService } from "../../services/create-manual-vacancy-service";

export const createVacancyRoute = new Elysia().use(authed).post(
    "/vacancies",
    async ({ user, session, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await createManualVacancyService(
            user.id,
            org.data,
            body,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 500,
                errorToResponse(result.error),
            );
        return status(201, CommonResponse.created({ response: result.data }));
    },
    {
        authed: true,
        body: createManualVacancySchema,
        response: {
            201: createdResponseSchema(vacancySchema, "Vacancy"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "Create a vacancy from a manual role description",
        },
    },
);
