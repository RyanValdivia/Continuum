import { Elysia } from "elysia";
import { z } from "zod";
import { notionStatusSchema } from "@/core/notion/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { getNotionStatusService } from "../../services/get-notion-status-service";

export const getNotionStatusRoute = new Elysia().use(authed).get(
    "/:organizationId/status",
    async ({ user, params, status }) => {
        const result = await getNotionStatusService(
            params.organizationId,
            user.id,
        );
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
        params: z.object({ organizationId: z.string() }),
        response: {
            200: successResponseSchema(notionStatusSchema, "NotionStatus"),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: { tags: ["Notion"], summary: "Get the org's Notion connection status" },
    },
);
