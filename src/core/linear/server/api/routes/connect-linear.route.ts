import { Elysia } from "elysia";
import { z } from "zod";
import { authed } from "@/server/auth/middleware/authed";
import {
    errorResponseSchema,
    errorToResponse,
} from "@/server/common/responses";
import { getLinearConnectUrlService } from "../../services/get-linear-connect-url-service";

export const connectLinearRoute = new Elysia().use(authed).get(
    "/:organizationId/connect",
    async ({ user, params, redirect, status }) => {
        const result = await getLinearConnectUrlService(
            params.organizationId,
            user.id,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 422 | 500,
                errorToResponse(result.error),
            );
        return redirect(result.data);
    },
    {
        authed: true,
        params: z.object({ organizationId: z.string() }),
        response: {
            403: errorResponseSchema(403),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Linear"],
            summary: "Redirect to Linear's OAuth consent screen",
        },
    },
);
