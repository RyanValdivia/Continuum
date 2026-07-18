"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useElysia } from "@/frontend/lib/eden";

/**
 * Client hooks for the authorization admin surface (OUs/groups, memberships,
 * ACL grants, the org access policy). Principal list invalidation is
 * automatic (its query takes no params); membership/ACE queries are keyed by
 * a required `groupId`/`resourceId`, so those hooks return `refetch` and the
 * calling component re-fetches directly after a mutation instead of fighting
 * a parameterized cache key.
 */
export const useAuthorization = () => {
    const client = useElysia().authorization;
    const queryClient = useQueryClient();
    const PRINCIPALS_KEY = client.principals.get.queryKey();

    const invalidatePrincipals = () =>
        queryClient.invalidateQueries({ queryKey: PRINCIPALS_KEY });

    const usePrincipals = () => useQuery(client.principals.get.queryOptions());

    const useCreatePrincipal = () =>
        useMutation(
            client.principals.post.mutationOptions({
                onSuccess: invalidatePrincipals,
            }),
        );

    const useUpdatePrincipal = (id: string) =>
        useMutation(
            client.principals({ id }).put.mutationOptions({
                onSuccess: invalidatePrincipals,
            }),
        );

    const useDeletePrincipal = (id: string) =>
        useMutation(
            client.principals({ id }).delete.mutationOptions({
                onSuccess: invalidatePrincipals,
            }),
        );

    const useMembershipsFor = (groupId: string) =>
        useQuery(
            client.memberships.get.queryOptions({ query: { groupId } }),
        );

    const useSetMembership = () =>
        useMutation(client.memberships.post.mutationOptions());

    const useRemoveMembership = () =>
        useMutation(client.memberships.delete.mutationOptions());

    const useAcesFor = (params: {
        resourceType: "knowledge_node" | "source_document" | "ou";
        resourceId: string;
    }) =>
        useQuery(
            client["access-control-entries"].get.queryOptions({
                query: params,
            }),
        );

    const useGrantAccess = () =>
        useMutation(
            client["access-control-entries"].post.mutationOptions(),
        );

    const useRevokeAccess = (id: string) =>
        useMutation(
            client["access-control-entries"]({ id }).delete.mutationOptions(),
        );

    const useAccessPolicy = () =>
        useQuery(client["access-policy"].get.queryOptions());

    const useSetAccessPolicy = () => {
        const POLICY_KEY = client["access-policy"].get.queryKey();
        return useMutation(
            client["access-policy"].put.mutationOptions({
                onSuccess: () =>
                    queryClient.invalidateQueries({ queryKey: POLICY_KEY }),
            }),
        );
    };

    return {
        usePrincipals,
        useCreatePrincipal,
        useUpdatePrincipal,
        useDeletePrincipal,
        useMembershipsFor,
        useSetMembership,
        useRemoveMembership,
        useAcesFor,
        useGrantAccess,
        useRevokeAccess,
        useAccessPolicy,
        useSetAccessPolicy,
    };
};
