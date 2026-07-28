"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useElysia } from "@/frontend/lib/eden";

export const usePlane = (organizationId: string) => {
    const client = useElysia().plane({ organizationId });
    const queryClient = useQueryClient();
    const STATUS_KEY = client.status.get.queryKey();

    const useStatus = () => useQuery(client.status.get.queryOptions());

    const useProjects = () => useQuery(client.projects.get.queryOptions());

    const useConnect = () =>
        useMutation(
            client.connect.post.mutationOptions({
                onSuccess: () =>
                    queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
            }),
        );

    const useDisconnect = () =>
        useMutation(
            client.delete.mutationOptions({
                onSuccess: () =>
                    queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
            }),
        );

    const useIngest = () => useMutation(client.ingest.post.mutationOptions());

    return { useStatus, useProjects, useConnect, useDisconnect, useIngest };
};
