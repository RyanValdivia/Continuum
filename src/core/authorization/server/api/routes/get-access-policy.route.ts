import { Elysia } from "elysia";
import { organizationAccessPolicySchema } from "@/core/authorization/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { getOrgAccessPolicyService } from "../../services/get-org-access-policy-service";

export const getAccessPolicyRoute = new Elysia().use(authed).get(
    "/",
    async ({ user, session, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await getOrgAccessPolicyService(user.id, org.data);
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
                organizationAccessPolicySchema,
                "OrganizationAccessPolicy",
            ),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Authorization"],
            summary: "Read the org's default ACL policy (open/closed)",
        },
    },
);
