import { Elysia } from "elysia";
import { z } from "zod";
import { authed } from "@/server/auth/middleware/authed";
import {
    errorResponseSchema,
    errorToResponse,
} from "@/server/common/responses";
import { getMicrosoftIdentityConnectUrlService } from "../../services/get-microsoft-identity-connect-url-service";

export const connectMicrosoftIdentityRoute = new Elysia().use(authed).get(
    "/:organizationId/connect-identity",
    async ({ user, params, redirect, status }) => {
        const result = await getMicrosoftIdentityConnectUrlService(
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
            tags: ["Microsoft"],
            summary: "Redirect to Microsoft's Sign in consent screen (personal link)",
        },
    },
);
