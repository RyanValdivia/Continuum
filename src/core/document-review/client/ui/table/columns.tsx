import type { ColumnDef, Row } from "@tanstack/react-table";
import type { VariantProps } from "class-variance-authority";
import { EllipsisIcon, TagIcon, TextIcon } from "lucide-react";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import type {
    Connector,
    DocumentReview,
    ReviewActionStatus,
    ReviewStatus,
} from "@/core/document-review/domain/types";
import DescriptionCell from "@/frontend/components/data-table/description-cell";
import { Badge, type badgeVariants } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { Checkbox } from "@/frontend/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/frontend/components/ui/dropdown-menu";
import { formatDate } from "@/frontend/lib/format";

/**
 * The shared `DataTableRowAction` variant union is fixed to `"update" | "delete"`
 * (`src/frontend/types/data-table.ts`) — widening it would leak this domain's
 * shape into every other table. Domain-local instead, carrying the status the
 * row action intends (Approve/Reject/Flag) so the modal knows what to seed.
 */
export interface DocumentReviewRowAction {
    row: Row<DocumentReview>;
    variant: "review";
    status: ReviewActionStatus;
}

const CONNECTOR_OPTIONS: { label: string; value: Connector }[] = [
    { label: "Notion", value: "notion" },
    { label: "Manual", value: "manual" },
];

const REVIEW_STATUS_OPTIONS: { label: string; value: ReviewStatus }[] = [
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Flagged", value: "flagged" },
];

const REVIEW_STATUS_BADGE_VARIANT: Record<
    ReviewStatus,
    VariantProps<typeof badgeVariants>["variant"]
> = {
    pending: "outline",
    approved: "default",
    rejected: "destructive",
    flagged: "secondary",
};

interface GetDocumentReviewTableColumnsProps {
    setRowAction: Dispatch<SetStateAction<DocumentReviewRowAction | null>>;
    /** Org slug — builds the row's link to `/{slug}/app/documents/{id}`. */
    slug: string;
}

/**
 * Column definitions for the document-reviews data table. Headers are plain
 * `<div>`s — sorting is driven by `DataTableSortList` in the toolbar, not
 * per-column header clicks. `title`/`connector`/`reviewStatus` carry
 * `enableColumnFilter` + `meta.variant` so the toolbar's filter drawer renders
 * a control for them and `useDataTable` wires a matching URL parser (see
 * `search-params.ts`). The `actions` column funnels Approve/Reject/Flag into
 * `setRowAction`, read back by `DocumentReviewsTable` to drive the review modal.
 */
export default function getDocumentReviewTableColumns({
    setRowAction,
    slug,
}: GetDocumentReviewTableColumnsProps): ColumnDef<DocumentReview>[] {
    return [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) =>
                        table.toggleAllPageRowsSelected(!!value)
                    }
                    aria-label="Select all"
                    className="translate-y-0.5"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-0.5"
                />
            ),
            enableSorting: false,
            enableHiding: false,
            size: 40,
        },
        {
            id: "title",
            accessorKey: "title",
            header: () => <div className="font-medium">Title</div>,
            cell: ({ row }) => (
                <Link
                    href={`/${slug}/app/documents/${row.original.id}`}
                    className="block max-w-64 truncate font-medium hover:underline"
                >
                    {row.original.title}
                </Link>
            ),
            enableSorting: true,
            enableColumnFilter: true,
            meta: {
                label: "Title",
                placeholder: "Search by title…",
                variant: "text",
                icon: TextIcon,
            },
        },
        {
            id: "connector",
            accessorKey: "connector",
            header: () => <div className="font-medium">Source</div>,
            cell: ({ row }) => (
                <Badge variant="outline">{row.original.connector}</Badge>
            ),
            enableSorting: false,
            enableColumnFilter: true,
            meta: {
                label: "Source",
                variant: "select",
                icon: TagIcon,
                options: CONNECTOR_OPTIONS,
            },
        },
        {
            id: "personId",
            accessorKey: "personId",
            header: () => <div className="font-medium">Attributed to</div>,
            cell: ({ row }) => (
                <DescriptionCell description={row.original.personId ?? "—"} />
            ),
            enableSorting: false,
            enableColumnFilter: false,
            meta: { label: "Attributed to" },
        },
        {
            id: "reviewStatus",
            accessorKey: "reviewStatus",
            header: () => <div className="font-medium">Review</div>,
            cell: ({ row }) => (
                <Badge
                    variant={
                        REVIEW_STATUS_BADGE_VARIANT[row.original.reviewStatus]
                    }
                >
                    {row.original.reviewStatus}
                </Badge>
            ),
            enableSorting: true,
            enableColumnFilter: true,
            meta: {
                label: "Review",
                variant: "select",
                icon: TagIcon,
                options: REVIEW_STATUS_OPTIONS,
            },
        },
        {
            id: "createdAt",
            accessorKey: "createdAt",
            header: () => <div className="font-medium">Ingested</div>,
            cell: ({ cell }) => (
                <span className="text-muted-foreground text-sm">
                    {formatDate(cell.getValue<string>())}
                </span>
            ),
            enableSorting: true,
            enableColumnFilter: false,
            meta: { label: "Ingested" },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Open document review actions"
                        >
                            <EllipsisIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onSelect={() =>
                                setRowAction({
                                    row,
                                    variant: "review",
                                    status: "approved",
                                })
                            }
                        >
                            Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() =>
                                setRowAction({
                                    row,
                                    variant: "review",
                                    status: "flagged",
                                })
                            }
                        >
                            Flag
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={() =>
                                setRowAction({
                                    row,
                                    variant: "review",
                                    status: "rejected",
                                })
                            }
                        >
                            Reject
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            enableSorting: false,
            enableHiding: false,
            size: 40,
        },
    ];
}
