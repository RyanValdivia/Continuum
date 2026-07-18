"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useElysia } from "@/frontend/lib/eden";

/** Plain link, not a fetch — clicking it must navigate the top-level page to
 *  Microsoft's consent screen, which a `useMutation` can't do. */
export function getMicrosoftConnectUrl(organizationId: string): string {
    return `/api/v1/microsoft/${organizationId}/connect`;
}

/** Plain link, not a fetch — same reasoning as `getMicrosoftConnectUrl`, but
 *  for the personal identity link instead of the org-wide tenant connection. */
export function getMicrosoftIdentityConnectUrl(organizationId: string): string {
    return `/api/v1/microsoft/${organizationId}/connect-identity`;
}

export const useMicrosoft = (organizationId: string) => {
    const client = useElysia().microsoft({ organizationId });
    const queryClient = useQueryClient();
    const STATUS_KEY = client.status.get.queryKey();

    const useStatus = () => useQuery(client.status.get.queryOptions());

    const useSites = () => useQuery(client.sites.get.queryOptions());

    const useDriveItems = (driveId: string, folderId?: string) =>
        useQuery(
            client.drives({ driveId }).items.get.queryOptions({
                query: { folderId },
            }),
        );

    const useTeams = () => useQuery(client.teams.get.queryOptions());

    const useChannels = (teamId: string) =>
        useQuery(client.teams({ teamId }).channels.get.queryOptions());

    const useDisconnect = () =>
        useMutation(
            client.delete.mutationOptions({
                onSuccess: () =>
                    queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
            }),
        );

    const useIngestFiles = () =>
        useMutation(client.ingest.files.post.mutationOptions());

    const useIngestTeams = () =>
        useMutation(client.ingest.teams.post.mutationOptions());

    return {
        useStatus,
        useSites,
        useDriveItems,
        useTeams,
        useChannels,
        useDisconnect,
        useIngestFiles,
        useIngestTeams,
    };
};

/** The personal identity link — any member connects their own Microsoft
 *  account so Teams messages get attributed to them, separate from the
 *  org-wide tenant connection above. */
export const useMicrosoftIdentity = (organizationId: string) => {
    const client = useElysia().microsoft({ organizationId }).identity;
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
