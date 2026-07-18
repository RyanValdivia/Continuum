"use client";

import type { Table } from "@tanstack/react-table";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import type { DocumentReview } from "@/core/document-review/domain/types";
import {
    DataTableActionBar,
    DataTableActionBarAction,
    DataTableActionBarSelection,
} from "@/frontend/components/data-table/data-table-action-bar";
import { Separator } from "@/frontend/components/ui/separator";
import { exportTableToCSV } from "@/frontend/lib/export";

/** Bulk action bar shown over the document-reviews table while rows are
 *  selected. CSV export only for MVP — a bulk-approve is a clean follow-up. */
export default function DocumentReviewTableActionBar({
    table,
}: {
    table: Table<DocumentReview>;
}) {
    return (
        <DataTableActionBar table={table}>
            <DataTableActionBarSelection table={table} />
            <Separator
                orientation="vertical"
                className="hidden data-[orientation=vertical]:h-5 sm:block"
            />
            <DataTableActionBarAction
                tooltip="Export"
                onClick={() => {
                    exportTableToCSV(table, {
                        filename: "document-reviews",
                        excludeColumns: ["select", "actions"],
                        onlySelected: true,
                    });
                    toast.success("Exported");
                }}
            >
                <DownloadIcon />
            </DataTableActionBarAction>
        </DataTableActionBar>
    );
}
