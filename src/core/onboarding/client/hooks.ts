"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { CreateOnboardingInput } from "@/core/onboarding/domain/types";

/**
 * Mutation hooks for the onboarding domain. Reads are RSC-driven (the page
 * awaits the services directly), so these fetch the REST endpoints and
 * `router.refresh()` on success to re-render the server components. Plain fetch
 * (not the Eden proxy) keeps the new routes off the treaty type surface.
 */
async function postJson(url: string, body?: unknown): Promise<void> {
    const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
    });
    if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.code ?? `HTTP ${res.status}`);
    }
}

export const useOnboarding = () => {
    const router = useRouter();

    const useGeneratePlan = () =>
        useMutation({
            mutationFn: (input: CreateOnboardingInput) =>
                postJson("/api/v1/onboarding/generate", input),
            onSuccess: () => router.refresh(),
        });

    const useToggleTask = () =>
        useMutation({
            mutationFn: ({
                planId,
                taskId,
            }: {
                planId: string;
                taskId: string;
            }) =>
                postJson(`/api/v1/onboarding/${planId}/tasks/${taskId}/toggle`),
            onSuccess: () => router.refresh(),
        });

    return { useGeneratePlan, useToggleTask };
};
