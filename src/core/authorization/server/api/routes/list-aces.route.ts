import { Elysia } from "elysia";
import { z } from "zod";
import {
    accessControlEntrySchema,
    aclResourceTypeSchema,
} from "@/core/authorization/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listAcesForResourceService } from "../../services/list-aces-for-resource-service";

export const listAcesRoute = new Elysia().use(authed).get(
    "/",
    async ({ user, session, query, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await listAcesForResourceService(user.id, org.data, query);
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
        query: z.object({
            resourceType: aclResourceTypeSchema,
            resourceId: z.string().trim().min(1),
        }),
        response: {
            200: successResponseSchema(
                z.array(accessControlEntrySchema),
                "AccessControlEntries",
            ),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Authorization"],
            summary: "List every ACE granted on one resource",
        },
    },
);
