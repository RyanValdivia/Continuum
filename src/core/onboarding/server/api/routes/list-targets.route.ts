import { Elysia } from "elysia";
import { z } from "zod";
import { onboardingTargetSchema } from "@/core/onboarding/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listOnboardingTargetsService } from "../../services/list-onboarding-targets-service";

export const listTargetsRoute = new Elysia().use(authed).get(
    "/targets",
    async ({ user, session, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await listOnboardingTargetsService(user.id, org.data);
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
                z.array(onboardingTargetSchema),
                "OnboardingTargets",
            ),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Onboarding"],
            summary: "List members a new hire can step into",
        },
    },
);
