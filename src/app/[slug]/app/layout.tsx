import type { PropsWithChildren } from "react";
import { OrganizationProvider } from "@/frontend/components/auth/organization-provider";
import { Separator } from "@/frontend/components/ui/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/frontend/components/ui/sidebar";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";
import { AppHeaderTitle, AppSidebar } from "./app-sidebar";

export default async function AppLayout({
    children,
    params,
}: PropsWithChildren<{ params: Promise<{ slug: string }> }>) {
    const { user } = await requireAuth();
    const { slug } = await params;
    await requireOrganization(slug, user.id);

    return (
        <OrganizationProvider slug={slug}>
            <SidebarProvider>
                <AppSidebar slug={slug} userEmail={user.email} />
                <SidebarInset>
                    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="h-5" />
                        <AppHeaderTitle />
                    </header>
                    <div className="flex flex-1 flex-col">{children}</div>
                </SidebarInset>
            </SidebarProvider>
        </OrganizationProvider>
    );
}
