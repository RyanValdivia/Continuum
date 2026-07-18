"use client";

import {
    createContext,
    type PropsWithChildren,
    use,
    useEffect,
} from "react";
import { toast } from "sonner";
import { authClient } from "@/frontend/auth/auth";

type ActiveOrganization = ReturnType<
    typeof authClient.useActiveOrganization
>["data"];

type OrganizationContextValue = {
    /** Slug this subtree is scoped to — matches the URL segment, not necessarily `organization.slug` yet if the switch is still pending. */
    slug: string;
    organization: ActiveOrganization;
    isPending: boolean;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(
    null,
);

export type OrganizationProviderProps = PropsWithChildren<{
    /** Organization slug (e.g. from the route) to set as Better Auth's active organization. */
    slug: string;
}>;

/**
 * Keeps Better Auth's active organization in sync with `slug` and exposes it
 * through context, so any route nested under a `/[slug]` segment can read the
 * current organization without re-fetching it.
 */
export function OrganizationProvider({
    slug,
    children,
}: OrganizationProviderProps) {
    const { data: organization, isPending } = authClient.useActiveOrganization();

    useEffect(() => {
        if (organization?.slug === slug) return;

        authClient.organization
            .setActive({ organizationSlug: slug })
            .then(({ error }) => {
                if (error) {
                    toast.error(
                        error.message ?? "Failed to switch organization",
                    );
                }
            });
    }, [slug, organization?.slug]);

    return (
        <OrganizationContext.Provider value={{ slug, organization, isPending }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = use(OrganizationContext);
    if (!context) {
        throw new Error(
            "useOrganization must be used within an OrganizationProvider",
        );
    }
    return context;
}
