import { Elysia } from "elysia";
import { z } from "zod";
import { onboardingPlanViewSchema } from "@/core/onboarding/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { toggleTaskService } from "../../services/toggle-task-service";

export const toggleTaskRoute = new Elysia().use(authed).post(
    "/:id/tasks/:taskId/toggle",
    async ({ user, session, params, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await toggleTaskService(
            user.id,
            org.data,
            params.id,
            params.taskId,
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
        params: z.object({ id: z.string(), taskId: z.string() }),
        response: {
            200: successResponseSchema(
                onboardingPlanViewSchema,
                "OnboardingPlan",
            ),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Onboarding"],
            summary: "Toggle a task's done-state on the caller's plan",
        },
    },
);
