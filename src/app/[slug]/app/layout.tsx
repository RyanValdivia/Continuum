import Link from "next/link";
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
                    <div className="flex items-center gap-6">
                        <OrganizationSwitcher hidePersonal />
                        <nav className="flex items-center gap-4 text-sm">
                            <Link
                                href={`/${slug}/app/projects`}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Proyectos
                            </Link>
                            <Link
                                href={`/${slug}/app/integrations`}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Integraciones
                            </Link>
                        </nav>
                    </div>
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
