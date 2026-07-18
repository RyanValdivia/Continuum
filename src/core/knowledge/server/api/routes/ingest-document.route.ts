import { Elysia } from "elysia";
import {
    ingestDocumentSchema,
    ingestResultSchema,
} from "@/core/knowledge/domain/schemas";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    createdResponseSchema,
    errorResponseSchema,
    errorToResponse,
} from "@/server/common/responses";
import { ingestDocumentService } from "../../services/ingest-document-service";
import { requireActiveOrg } from "../require-active-org";

export const ingestDocumentRoute = new Elysia().use(authed).post(
    "/ingest",
    async ({ session, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const result = await ingestDocumentService(org.data, body);
        if (!result.ok)
            return status(
                result.error.status as 500,
                errorToResponse(result.error),
            );
        return status(201, CommonResponse.created({ response: result.data }));
    },
    {
        authed: true,
        body: ingestDocumentSchema,
        response: {
            201: createdResponseSchema(ingestResultSchema, "IngestResult"),
            400: errorResponseSchema(400),
            403: errorResponseSchema(403),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Knowledge"],
            summary: "Ingest a source document",
            description:
                "Source-agnostic ingestion: chunks + embeds a document's text and extracts a knowledge subgraph. Called by connectors (Notion, manual).",
        },
    },
);
