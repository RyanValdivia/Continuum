import { Elysia } from "elysia";
import { onboardingPlanViewSchema } from "@/core/onboarding/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { getMyOnboardingService } from "../../services/get-my-onboarding-service";

export const getMyOnboardingRoute = new Elysia().use(authed).get(
    "/me",
    async ({ user, session, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await getMyOnboardingService(user.id, org.data);
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
        response: {
            200: successResponseSchema(
                onboardingPlanViewSchema.nullable(),
                "MyOnboarding",
            ),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Onboarding"],
            summary: "Get the current member's onboarding plan",
        },
    },
);
