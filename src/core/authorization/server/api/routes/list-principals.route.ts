import { Elysia } from "elysia";
import { z } from "zod";
import { principalSchema } from "@/core/authorization/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listPrincipalsService } from "../../services/list-principals-service";

export const listPrincipalsRoute = new Elysia().use(authed).get(
    "/",
    async ({ user, session, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await listPrincipalsService(user.id, org.data);
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
            200: successResponseSchema(z.array(principalSchema), "Principals"),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Authorization"],
            summary: "List every principal (person/group/ou) in the active org",
            description: "Owner/admin only. Flat — the client builds the OU tree from parentId.",
        },
    },
);
