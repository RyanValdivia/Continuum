import { Elysia } from "elysia";
import { z } from "zod";
import { personListItemSchema } from "@/core/recruitment/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listPeopleService } from "../../services/list-people-service";

export const listPeopleRoute = new Elysia().use(authed).get(
    "/people",
    async ({ user, session, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await listPeopleService(user.id, org.data);
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
                z.array(personListItemSchema),
                "PersonList",
            ),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "List org members with their graph state",
            description:
                "Owner/admin only. Syncs member → person nodes and returns each member with their node type (person / vacancy / none).",
        },
    },
);
