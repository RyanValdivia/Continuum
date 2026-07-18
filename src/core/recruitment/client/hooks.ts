"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useElysia } from "@/frontend/lib/eden";

/**
 * Mutation hooks for the recruitment domain. Lists are RSC-driven (pages
 * await services directly), so onSuccess refreshes the server components
 * instead of invalidating client queries.
 */
export const useRecruitment = () => {
    const client = useElysia().recruitment;
    const router = useRouter();

    const useOffboard = (memberId: string) =>
        useMutation(
            client.people({ memberId }).offboard.post.mutationOptions({
                onSuccess: () => router.refresh(),
            }),
        );

    const useCreateVacancy = () =>
        useMutation(
            client.vacancies.post.mutationOptions({
                onSuccess: () => router.refresh(),
            }),
        );

    const useRegenerateToken = (id: string) =>
        useMutation(
            client.vacancies({ id })["regenerate-token"].post.mutationOptions({
                onSuccess: () => router.refresh(),
            }),
        );

    const useCloseVacancy = (id: string) =>
        useMutation(
            client.vacancies({ id }).close.post.mutationOptions({
                onSuccess: () => router.refresh(),
            }),
        );

    const useRetryAnalysis = () =>
        useMutation({
            mutationFn: (id: string) =>
                client
                    .candidates({ id })
                    ["retry-analysis"].post.mutationOptions()
                    .mutationFn(undefined),
            onSuccess: () => router.refresh(),
        });

    const useDeleteCandidate = () =>
        useMutation({
            mutationFn: (id: string) =>
                client
                    .candidates({ id })
                    .delete.mutationOptions()
                    .mutationFn(undefined),
            onSuccess: () => router.refresh(),
        });

    return {
        useOffboard,
        useCreateVacancy,
        useRegenerateToken,
        useCloseVacancy,
        useRetryAnalysis,
        useDeleteCandidate,
    };
};
