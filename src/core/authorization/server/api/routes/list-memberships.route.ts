import { Elysia } from "elysia";
import { z } from "zod";
import { membershipSchema } from "@/core/authorization/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listMembershipsService } from "../../services/list-memberships-service";

export const listMembershipsRoute = new Elysia().use(authed).get(
    "/",
    async ({ user, session, query, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await listMembershipsService(
            user.id,
            org.data,
            query.groupId,
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
        query: z.object({ groupId: z.string().trim().min(1) }),
        response: {
            200: successResponseSchema(z.array(membershipSchema), "Memberships"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: { tags: ["Authorization"], summary: "List a group's direct members" },
    },
);
