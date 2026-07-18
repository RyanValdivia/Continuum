import type { PropsWithChildren } from "react";
import { OrganizationSwitcher } from "@/frontend/components/auth/organization/organization-switcher";
import { OrganizationProvider } from "@/frontend/components/auth/organization-provider";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";
import { SignOutButton } from "./sign-out-button";

export default async function AppLayout({
    children,
    params,
}: PropsWithChildren<{ params: Promise<{ slug: string }> }>) {
    const { user } = await requireAuth();
    const { slug } = await params;
    await requireOrganization(slug, user.id);

    return (
        <OrganizationProvider slug={slug}>
            <div className="min-h-svh">
                <header className="flex items-center justify-between border-b px-6 py-3">
                    <OrganizationSwitcher hidePersonal />
                    <div className="flex items-center gap-3 text-muted-foreground text-sm">
                        <span>{user.email}</span>
                        <SignOutButton />
                    </div>
                </header>
                <main>{children}</main>
            </div>
        </OrganizationProvider>
    );
}
