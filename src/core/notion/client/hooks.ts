"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useElysia } from "@/frontend/lib/eden";

/** Plain link, not a fetch — clicking it must navigate the top-level page to
 *  Notion's consent screen, which a `useMutation` can't do. */
export function getNotionConnectUrl(organizationId: string): string {
    return `/api/v1/notion/${organizationId}/connect`;
}

export const useNotion = (organizationId: string) => {
    const client = useElysia().notion({ organizationId });
    const queryClient = useQueryClient();
    const STATUS_KEY = client.status.get.queryKey();

    const useStatus = () => useQuery(client.status.get.queryOptions());

    const usePages = () => useQuery(client.pages.get.queryOptions());

    const useDisconnect = () =>
        useMutation(
            client.delete.mutationOptions({
                onSuccess: () =>
                    queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
            }),
        );

    return { useStatus, usePages, useDisconnect };
};
