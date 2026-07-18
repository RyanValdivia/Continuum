import { Elysia } from "elysia";
import {
    membershipSchema,
    setMembershipSchema,
} from "@/core/authorization/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    createdResponseSchema,
    errorResponseSchema,
    errorToResponse,
} from "@/server/common/responses";
import { setMembershipService } from "../../services/set-membership-service";

export const setMembershipRoute = new Elysia().use(authed).post(
    "/",
    async ({ user, session, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await setMembershipService(user.id, org.data, body);
        if (!result.ok)
            return status(
                result.error.status as 400 | 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(201, CommonResponse.created({ response: result.data }));
    },
    {
        authed: true,
        body: setMembershipSchema,
        response: {
            201: createdResponseSchema(membershipSchema, "Membership"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Authorization"],
            summary: "Add a person or group to a group",
            description: "Owner/admin only. Idempotent.",
        },
    },
);
