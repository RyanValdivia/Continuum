"use client";

import type { LucideIcon } from "lucide-react";
import { FolderKanban, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/frontend/auth/auth";
import { OrganizationSwitcher } from "@/frontend/components/auth/organization/organization-switcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/frontend/components/ui/sidebar";

type NavItem = { title: string; segment: string; icon: LucideIcon };

const NAV: NavItem[] = [
    { title: "Proyectos", segment: "projects", icon: FolderKanban },
    { title: "Conocimiento", segment: "knowledge", icon: Sparkles },
];

function useActiveTitle(): string {
    const pathname = usePathname();
    const match = NAV.find((item) => pathname.includes(`/app/${item.segment}`));
    return match?.title ?? "App";
}

/** Section title for the content header, driven by the active route. */
export function AppHeaderTitle() {
    return <span className="font-medium text-sm">{useActiveTitle()}</span>;
}

export function AppSidebar({
    slug,
    userEmail,
}: {
    slug: string;
    userEmail: string;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const signOut = async () => {
        await authClient.signOut();
        router.push("/auth/sign-in");
    };

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <div className="group-data-[collapsible=icon]:hidden">
                    <OrganizationSwitcher hidePersonal />
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {NAV.map((item) => {
                                const href = `/${slug}/app/${item.segment}`;
                                const active =
                                    pathname === href ||
                                    pathname.startsWith(`${href}/`);
                                return (
                                    <SidebarMenuItem key={item.segment}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={active}
                                            tooltip={item.title}
                                            className="data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
                                        >
                                            <Link href={href}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <div className="truncate px-2 text-muted-foreground text-xs group-data-[collapsible=icon]:hidden">
                    {userEmail}
                </div>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={signOut}
                            tooltip="Cerrar sesión"
                        >
                            <LogOut />
                            <span>Cerrar sesión</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
