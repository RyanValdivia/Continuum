import { Elysia } from "elysia";
import { z } from "zod";
import {
    documentReviewSchema,
    reviewDocumentSchema,
} from "@/core/document-review/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { reviewDocumentService } from "../../services/review-document-service";

export const reviewDocumentRoute = new Elysia().use(authed).patch(
    "/:id/review",
    async ({ user, session, params, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await reviewDocumentService(
            user.id,
            org.data,
            params.id,
            body,
        );
        if (!result.ok)
            return status(
                result.error.status as 400 | 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        params: z.object({ id: z.string() }),
        body: reviewDocumentSchema,
        response: {
            200: successResponseSchema(documentReviewSchema, "DocumentReview"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Document Reviews"],
            summary: "Set a document's review status",
        },
    },
);
