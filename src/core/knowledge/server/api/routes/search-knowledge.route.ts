import { Elysia } from "elysia";
import {
    searchKnowledgeSchema,
    searchResultSchema,
} from "@/core/knowledge/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { searchKnowledgeService } from "../../services/search-knowledge-service";

export const searchKnowledgeRoute = new Elysia().use(authed).post(
    "/search",
    async ({ session, user, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await searchKnowledgeService(org.data, user.id, body);
        if (!result.ok)
            return status(
                result.error.status as 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        body: searchKnowledgeSchema,
        response: {
            200: successResponseSchema(searchResultSchema, "SearchResult"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Knowledge"],
            summary: "Hybrid search over the knowledge graph",
            description:
                "Embeds the query, retrieves top chunks + nodes by cosine similarity, then expands matched nodes through the graph. Optionally scoped to one person.",
        },
    },
);
