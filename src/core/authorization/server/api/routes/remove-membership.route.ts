import { Elysia } from "elysia";
import { z } from "zod";
import { setMembershipSchema } from "@/core/authorization/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { removeMembershipService } from "../../services/remove-membership-service";

export const removeMembershipRoute = new Elysia().use(authed).delete(
    "/",
    async ({ user, session, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await removeMembershipService(user.id, org.data, body);
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(200, CommonResponse.successful({ response: {} }));
    },
    {
        authed: true,
        body: setMembershipSchema,
        response: {
            200: successResponseSchema(z.object({}), "RemoveMembership"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Authorization"],
            summary: "Remove a person or group from a group",
        },
    },
);
