import { Elysia } from "elysia";
import { getDocumentRoute } from "./routes/get-document.route";
import { listDocumentsRoute } from "./routes/list-documents.route";
import { reviewDocumentRoute } from "./routes/review-document.route";

export const documentReviewRouter = new Elysia({ prefix: "/document-reviews" })
    .use(listDocumentsRoute)
    .use(getDocumentRoute)
    .use(reviewDocumentRoute);
