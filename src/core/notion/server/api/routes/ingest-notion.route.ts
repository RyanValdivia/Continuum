import { Elysia } from "elysia";
import { z } from "zod";
import {
    ingestNotionSchema,
    notionIngestResultSchema,
} from "@/core/notion/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { ingestNotionPagesService } from "../../services/ingest-notion-pages-service";

export const ingestNotionRoute = new Elysia().use(authed).post(
    "/:organizationId/ingest",
    async ({ user, params, body, status }) => {
        const result = await ingestNotionPagesService(
            params.organizationId,
            user.id,
            body,
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
        body: ingestNotionSchema,
        response: {
            200: successResponseSchema(
                notionIngestResultSchema,
                "NotionIngestResult",
            ),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            422: errorResponseSchema(422),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Notion"],
            summary: "Ingest selected Notion pages into the knowledge graph",
        },
    },
);
