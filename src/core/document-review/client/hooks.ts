"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useElysia } from "@/frontend/lib/eden";

/**
 * Client mutation hooks for the document-reviews domain. The list is
 * RSC-driven (see `/documents/page.tsx` → `server.tsx` → `DocumentReviewsTable`)
 * so there is no client list query to invalidate — the review mutation's
 * `onSuccess` calls `router.refresh()` instead, which re-runs the server
 * component against the current URL search params.
 */
export const useDocumentReviews = () => {
    const client = useElysia()["document-reviews"];
    const router = useRouter();

    const useReview = (id: string) =>
        useMutation(
            client({ id }).review.patch.mutationOptions({
                onSuccess: () => router.refresh(),
            }),
        );

    return { useReview };
};
