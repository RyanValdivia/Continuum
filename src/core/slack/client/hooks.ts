"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useElysia } from "@/frontend/lib/eden";

/** Plain link, not a fetch — clicking it must navigate the top-level page to
 *  Slack's consent screen, which a `useMutation` can't do. */
export function getSlackConnectUrl(organizationId: string): string {
    return `/api/v1/slack/${organizationId}/connect`;
}

export function getSlackWorkspaceConnectUrl(organizationId: string): string {
    return `/api/v1/slack/${organizationId}/workspace/connect`;
}

export const useSlack = (organizationId: string) => {
    const client = useElysia().slack({ organizationId });
    const queryClient = useQueryClient();
    const STATUS_KEY = client.status.get.queryKey();

    const useStatus = () => useQuery(client.status.get.queryOptions());

    const useDisconnect = () =>
        useMutation(
            client.delete.mutationOptions({
                onSuccess: () =>
                    queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
            }),
        );

    return { useStatus, useDisconnect };
};

/** The org-wide bot install + channel picker — admin-only, separate from the
 *  personal identity link above. */
export const useSlackWorkspace = (organizationId: string) => {
    const client = useElysia().slack({ organizationId }).workspace;
    const queryClient = useQueryClient();
    const STATUS_KEY = client.status.get.queryKey();
    const CHANNELS_KEY = client.channels.get.queryKey();

    const useStatus = () => useQuery(client.status.get.queryOptions());

    const useDisconnect = () =>
        useMutation(
            client.delete.mutationOptions({
                onSuccess: () =>
                    queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
            }),
        );

    const useChannels = () => useQuery(client.channels.get.queryOptions());

    const useToggleChannel = (channelId: string) =>
        useMutation(
            client
                .channels({ channelId })
                .patch.mutationOptions({
                    onSuccess: () =>
                        queryClient.invalidateQueries({
                            queryKey: CHANNELS_KEY,
                        }),
                }),
        );

    const useSyncChannel = (channelId: string) =>
        useMutation(client.channels({ channelId }).sync.post.mutationOptions());

    return {
        useStatus,
        useDisconnect,
        useChannels,
        useToggleChannel,
        useSyncChannel,
    };
};
