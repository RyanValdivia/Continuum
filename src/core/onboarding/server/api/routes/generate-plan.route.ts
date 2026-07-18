import { Elysia } from "elysia";
import {
    createOnboardingInputSchema,
    onboardingPlanViewSchema,
} from "@/core/onboarding/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    createdResponseSchema,
    errorResponseSchema,
    errorToResponse,
} from "@/server/common/responses";
import { generateOnboardingPlanService } from "../../services/generate-onboarding-plan-service";

export const generatePlanRoute = new Elysia().use(authed).post(
    "/generate",
    async ({ user, session, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await generateOnboardingPlanService(
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
        body: createOnboardingInputSchema,
        response: {
            201: createdResponseSchema(
                onboardingPlanViewSchema,
                "OnboardingPlan",
            ),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Onboarding"],
            summary: "Generate an onboarding plan for the current member",
            description:
                "Builds a role digest from the predecessor's captured knowledge and asks Gemini for a day-by-day plan.",
        },
    },
);
