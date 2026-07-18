import { Elysia } from "elysia";
import {
    createPrincipalSchema,
    principalSchema,
} from "@/core/authorization/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    createdResponseSchema,
    errorResponseSchema,
    errorToResponse,
} from "@/server/common/responses";
import { createPrincipalService } from "../../services/create-principal-service";

export const createPrincipalRoute = new Elysia().use(authed).post(
    "/",
    async ({ user, session, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await createPrincipalService(user.id, org.data, body);
        if (!result.ok)
            return status(
                result.error.status as 400 | 403 | 500,
                errorToResponse(result.error),
            );
        return status(201, CommonResponse.created({ response: result.data }));
    },
    {
        authed: true,
        body: createPrincipalSchema,
        response: {
            201: createdResponseSchema(principalSchema, "Principal"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Authorization"],
            summary: "Create an OU or security group",
            description: "Owner/admin only. `parentId`, if set, must be an existing OU.",
        },
    },
);
