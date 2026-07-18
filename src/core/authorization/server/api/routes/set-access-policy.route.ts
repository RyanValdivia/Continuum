import { Elysia } from "elysia";
import {
    organizationAccessPolicySchema,
    setOrgAccessPolicySchema,
} from "@/core/authorization/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { setOrgAccessPolicyService } from "../../services/set-org-access-policy-service";

export const setAccessPolicyRoute = new Elysia().use(authed).put(
    "/",
    async ({ user, session, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await setOrgAccessPolicyService(user.id, org.data, body);
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
        body: setOrgAccessPolicySchema,
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
            summary: "Set the org's default ACL policy (open/closed)",
            description:
                "Owner/admin only. 'open' (default) = a resource with no ACE is readable by every member. 'closed' = a resource needs an explicit allow ACE.",
        },
    },
);
