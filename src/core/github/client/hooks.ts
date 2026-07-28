"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useElysia } from "@/frontend/lib/eden";

/** Plain link, not a fetch — clicking it must navigate the top-level page to
 *  GitHub's consent screen, which a `useMutation` can't do. */
export function getGithubConnectUrl(organizationId: string): string {
    return `/api/v1/github/${organizationId}/connect`;
}

export const useGithub = (organizationId: string) => {
    const client = useElysia().github({ organizationId });
    const queryClient = useQueryClient();
    const STATUS_KEY = client.status.get.queryKey();

    const useStatus = () => useQuery(client.status.get.queryOptions());

    const useRepos = () => useQuery(client.repos.get.queryOptions());

    const useDisconnect = () =>
        useMutation(
            client.delete.mutationOptions({
                onSuccess: () =>
                    queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
            }),
        );

    const useIngest = () => useMutation(client.ingest.post.mutationOptions());

    return { useStatus, useRepos, useDisconnect, useIngest };
};
