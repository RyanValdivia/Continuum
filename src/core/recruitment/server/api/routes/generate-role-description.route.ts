import { Elysia } from "elysia";
import {
    generatedRoleSchema,
    generateRoleInputSchema,
} from "@/core/recruitment/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { generateRoleDescriptionService } from "../../services/generate-role-description-service";

export const generateRoleDescriptionRoute = new Elysia().use(authed).post(
    "/vacancies/generate-description",
    async ({ user, session, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await generateRoleDescriptionService(
            user.id,
            org.data,
            body,
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
        body: generateRoleInputSchema,
        response: {
            200: successResponseSchema(generatedRoleSchema, "GeneratedRole"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary:
                "Draft a role description with AI (optionally from a person)",
        },
    },
);
