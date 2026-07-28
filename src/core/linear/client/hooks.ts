"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useElysia } from "@/frontend/lib/eden";

/** Plain link, not a fetch — clicking it must navigate the top-level page to
 *  Linear's consent screen, which a `useMutation` can't do. */
export function getLinearConnectUrl(organizationId: string): string {
    return `/api/v1/linear/${organizationId}/connect`;
}

export const useLinear = (organizationId: string) => {
    const client = useElysia().linear({ organizationId });
    const queryClient = useQueryClient();
    const STATUS_KEY = client.status.get.queryKey();

    const useStatus = () => useQuery(client.status.get.queryOptions());

    const useIssues = () => useQuery(client.issues.get.queryOptions());

    const useDisconnect = () =>
        useMutation(
            client.delete.mutationOptions({
                onSuccess: () =>
                    queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
            }),
        );

    const useIngest = () => useMutation(client.ingest.post.mutationOptions());

    return { useStatus, useIssues, useDisconnect, useIngest };
};
