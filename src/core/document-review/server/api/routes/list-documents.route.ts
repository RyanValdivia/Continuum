import { Elysia } from "elysia";
import {
    documentReviewSearchSchema,
    paginatedDocumentReviewsSchema,
} from "@/core/document-review/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { searchDocumentsService } from "../../services/search-documents-service";

export const listDocumentsRoute = new Elysia().use(authed).get(
    "/",
    async ({ user, session, query, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await searchDocumentsService(user.id, org.data, query);
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
        query: documentReviewSearchSchema,
        response: {
            200: successResponseSchema(
                paginatedDocumentReviewsSchema,
                "PaginatedDocumentReviews",
            ),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Document Reviews"],
            summary: "Search the active org's ingested documents",
            description:
                "Owner/admin only. Returns one filtered, paginated, sortable page of the active organization's source documents.",
        },
    },
);
