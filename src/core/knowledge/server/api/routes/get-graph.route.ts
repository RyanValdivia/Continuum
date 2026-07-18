import { Elysia } from "elysia";
import { graphQuerySchema, graphSchema } from "@/core/knowledge/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { getGraphService } from "../../services/get-graph-service";
import { requireActiveOrg } from "../require-active-org";

export const getGraphRoute = new Elysia().use(authed).get(
    "/graph",
    async ({ session, query, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await getGraphService(org.data, query);
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
        query: graphQuerySchema,
        response: {
            200: successResponseSchema(graphSchema, "Graph"),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Knowledge"],
            summary: "Read a slice of the knowledge graph",
            description:
                "Returns newest nodes (optionally one person's) plus the edges among them, for visualization.",
        },
    },
);
