import type { DocumentReviewSearch } from "@/core/document-review/domain/types";
import { searchDocumentsService } from "@/core/document-review/server/services/search-documents-service";
import { resolveResult } from "@/frontend/lib/result";
import { requireAuth } from "@/server/auth/require-auth";
import DocumentReviewsTable from "./data-table";

/**
 * Server entry for the document-reviews table (the SSR data source). Kicks
 * off `searchDocumentsService` but does NOT await it — `Promise.all([...])`
 * is handed straight to the client `DocumentReviewsTable`, which reads it
 * with `React.use(promises)` under the route's `<Suspense>` boundary, so the
 * response streams instead of blocking on the query. `resolveResult` unwraps
 * the `AppResult` into `PaginatedDocumentReviews`, or throws an
 * `AppErrorException` — caught by the sibling `error.tsx` boundary (a 403
 * here means the page's own admin gate has a bug, since it already checked).
 */
export default async function DocumentReviewsTableServer({
    options,
    organizationId,
    slug,
}: {
    options: DocumentReviewSearch;
    organizationId: string;
    slug: string;
}) {
    const { user } = await requireAuth();
    const promises = Promise.all([
        resolveResult(searchDocumentsService(user.id, organizationId, options)),
    ]);

    return <DocumentReviewsTable promises={promises} slug={slug} />;
}
