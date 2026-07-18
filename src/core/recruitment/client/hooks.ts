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

    return { useOffboard };
};
