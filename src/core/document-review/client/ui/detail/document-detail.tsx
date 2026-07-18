"use client";

import type { VariantProps } from "class-variance-authority";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { DocumentDetail as DocumentDetailData } from "@/core/document-review/domain/types";
import { Badge, type badgeVariants } from "@/frontend/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";
import { Separator } from "@/frontend/components/ui/separator";
import { formatDate } from "@/frontend/lib/format";
import { useDocumentReviews } from "../../hooks";
import type { ReviewFormValues } from "../../validation";
import { ReviewForm } from "../forms/review-form";

const REVIEW_STATUS_BADGE_VARIANT: Record<
    DocumentDetailData["reviewStatus"],
    VariantProps<typeof badgeVariants>["variant"]
> = {
    pending: "outline",
    approved: "default",
    rejected: "destructive",
    flagged: "secondary",
};

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right">{value}</span>
        </div>
    );
}

/** Detail view for one ingested document: metadata, the ingested text, and an
 *  inline review form to change its status without going back to the table. */
export function DocumentDetail({
    document,
}: {
    document: DocumentDetailData;
}) {
    const { useReview } = useDocumentReviews();
    const review = useReview(document.id);

    function handleSubmit(values: ReviewFormValues) {
        review.mutate(
            {
                reviewStatus: values.reviewStatus,
                note: values.note.trim() || undefined,
            },
            {
                onSuccess: () => toast.success("Document reviewed"),
                onError: () => toast.error("Review failed"),
            },
        );
    }

    return (
        <div className="mx-auto grid w-full max-w-4xl gap-6 p-6 md:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{document.connector}</Badge>
                        <Badge
                            variant={
                                REVIEW_STATUS_BADGE_VARIANT[
                                    document.reviewStatus
                                ]
                            }
                        >
                            {document.reviewStatus}
                        </Badge>
                    </div>
                    <h1 className="font-semibold text-2xl">
                        {document.title}
                    </h1>
                    {document.url && (
                        <a
                            href={document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground hover:underline"
                        >
                            Open in source
                            <ExternalLink className="size-3.5" />
                        </a>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {document.content ? (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {document.content}
                            </p>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                No content ingested yet.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <MetaRow
                            label="Attributed to"
                            value={document.personId ?? "—"}
                        />
                        <MetaRow
                            label="Ingested"
                            value={formatDate(document.createdAt)}
                        />
                        {document.reviewedAt && (
                            <>
                                <Separator />
                                <MetaRow
                                    label="Reviewed by"
                                    value={document.reviewedBy ?? "—"}
                                />
                                <MetaRow
                                    label="Reviewed at"
                                    value={formatDate(document.reviewedAt)}
                                />
                                {document.reviewNote && (
                                    <p className="text-muted-foreground text-sm">
                                        “{document.reviewNote}”
                                    </p>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ReviewForm
                            defaultValues={{
                                reviewStatus:
                                    document.reviewStatus === "pending"
                                        ? "approved"
                                        : document.reviewStatus,
                                note: document.reviewNote ?? "",
                            }}
                            onSubmit={handleSubmit}
                            disabled={review.isPending}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
