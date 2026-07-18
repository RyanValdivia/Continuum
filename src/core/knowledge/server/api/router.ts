import { Elysia } from "elysia";
import { getGraphRoute } from "./routes/get-graph.route";
import { ingestDocumentRoute } from "./routes/ingest-document.route";
import { searchKnowledgeRoute } from "./routes/search-knowledge.route";

export const knowledgeRouter = new Elysia({ prefix: "/knowledge" })
    .use(ingestDocumentRoute)
    .use(searchKnowledgeRoute)
    .use(getGraphRoute);
