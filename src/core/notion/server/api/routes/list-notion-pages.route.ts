import { Elysia } from "elysia";
import { z } from "zod";
import { notionPagesSchema } from "@/core/notion/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { listNotionPagesService } from "../../services/list-notion-pages-service";

export const listNotionPagesRoute = new Elysia().use(authed).get(
    "/:organizationId/pages",
    async ({ user, params, status }) => {
        const result = await listNotionPagesService(
            params.organizationId,
            user.id,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 422 | 500,
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
            200: successResponseSchema(notionPagesSchema, "NotionPages"),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Notion"],
            summary: "List pages/databases shared with the Notion connection",
        },
    },
);
