"use client";

import { toast } from "sonner";
import type {
    DocumentReview,
    ReviewActionStatus,
} from "@/core/document-review/domain/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/frontend/components/ui/dialog";
import { useDocumentReviews } from "../../hooks";
import type { ReviewFormValues } from "../../validation";
import { ReviewForm } from "../forms/review-form";

interface ReviewDocumentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The document being reviewed. The caller conditionally renders this
     *  modal per row action, so `document` is always set while it's mounted. */
    document: DocumentReview;
    /** Status the row action intended (Approve/Reject/Flag) — seeds the form. */
    defaultStatus: ReviewActionStatus;
}

/** Modal for setting a document's review status, with an optional note. */
export function ReviewDocumentModal({
    open,
    onOpenChange,
    document,
    defaultStatus,
}: ReviewDocumentModalProps) {
    const { useReview } = useDocumentReviews();
    const review = useReview(document.id);

    function handleSubmit(values: ReviewFormValues) {
        review.mutate(
            {
                reviewStatus: values.reviewStatus,
                note: values.note.trim() || undefined,
            },
            {
                onSuccess: () => {
                    toast.success("Document reviewed");
                    onOpenChange(false);
                },
                onError: () => toast.error("Review failed"),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Review document</DialogTitle>
                    <DialogDescription>
                        {`Set a review status for "${document.title}".`}
                    </DialogDescription>
                </DialogHeader>
                <ReviewForm
                    defaultValues={{
                        reviewStatus: defaultStatus,
                        note: document.reviewNote ?? "",
                    }}
                    onSubmit={handleSubmit}
                    disabled={review.isPending}
                />
            </DialogContent>
        </Dialog>
    );
}
