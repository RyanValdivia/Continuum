"use client";

import * as React from "react";
import type {
    DocumentReview,
    PaginatedDocumentReviews,
} from "@/core/document-review/domain/types";
import { DataTable } from "@/frontend/components/data-table/data-table";
import { DataTableSortList } from "@/frontend/components/data-table/data-table-sort-list";
import { DataTableToolbar } from "@/frontend/components/data-table/data-table-toolbar";
import { useDataTable } from "@/frontend/hooks/use-data-table";
import { ReviewDocumentModal } from "../modals/review-document-modal";
import DocumentReviewTableActionBar from "./action-bar";
import getDocumentReviewTableColumns, {
    type DocumentReviewRowAction,
} from "./columns";

/**
 * Document-reviews data-table. Streams in via `React.use(promises)` —
 * `server.tsx` hands in an *unawaited* `Promise.all([...])` so this component
 * suspends under the route's `<Suspense>` boundary while the page loads,
 * instead of the RSC blocking on the query. Filter/sort/page changes write to
 * the URL with `shallow:false` so the RSC re-runs and streams the next page
 * in; there is no client fetch here.
 */
export default function DocumentReviewsTable({
    promises,
    slug,
}: {
    promises: Promise<[PaginatedDocumentReviews]>;
    slug: string;
}) {
    const [rowAction, setRowAction] =
        React.useState<DocumentReviewRowAction | null>(null);

    const [{ items, pageCount }] = React.use(promises);

    const columns = React.useMemo(
        () => getDocumentReviewTableColumns({ setRowAction, slug }),
        [slug],
    );

    const { table } = useDataTable({
        data: items,
        columns,
        pageCount,
        getRowId: (row: DocumentReview) => row.id,
        shallow: false,
        clearOnDefault: true,
        initialState: {
            sorting: [{ id: "createdAt", desc: true }],
            columnPinning: { right: ["actions"] },
        },
    });

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-semibold text-2xl">Document reviews</h1>
            </div>

            <DataTable
                table={table}
                actionBar={<DocumentReviewTableActionBar table={table} />}
            >
                <DataTableToolbar table={table}>
                    <DataTableSortList table={table} align="end" />
                </DataTableToolbar>
            </DataTable>

            {rowAction?.variant === "review" && rowAction.row && (
                <ReviewDocumentModal
                    open
                    onOpenChange={() => setRowAction(null)}
                    document={rowAction.row.original}
                    defaultStatus={rowAction.status}
                />
            )}
        </div>
    );
}
