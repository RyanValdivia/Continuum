import { Elysia } from "elysia";
import { z } from "zod";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { revokeAccessService } from "../../services/revoke-access-service";

export const revokeAccessRoute = new Elysia().use(authed).delete(
    "/:id",
    async ({ user, session, params, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await revokeAccessService(user.id, org.data, params.id);
        if (!result.ok)
            return status(
                result.error.status as 403 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: { id: params.id } }),
        );
    },
    {
        authed: true,
        params: z.object({ id: z.string() }),
        response: {
            200: successResponseSchema(
                z.object({ id: z.string() }),
                "RevokeAccess",
            ),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: { tags: ["Authorization"], summary: "Revoke an access grant" },
    },
);
