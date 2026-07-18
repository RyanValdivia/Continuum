"use client";

import { RouteError } from "@/frontend/components/auth/route-error";

/**
 * Route error boundary for /documents. `server.tsx` no longer awaits the
 * service — it hands the client `DocumentReviewsTable` an unawaited
 * `Promise.all` wrapping `resolveResult(searchDocumentsService(...))`.
 * `React.use(promises)` unwraps that promise on the client; if the service
 * returned an error branch, `resolveResult` rejected with an
 * `AppErrorException`, which `React.use` re-throws during render. This
 * boundary is what catches that (and any other param-parsing/rendering error
 * in the route) and offers a retry instead of white-screening.
 */
export default function DocumentsError({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <RouteError
            error={error}
            reset={reset}
            title="Algo salió mal"
            description="No pudimos cargar los documentos. Inténtalo de nuevo."
        />
    );
}
