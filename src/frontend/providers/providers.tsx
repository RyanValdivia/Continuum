"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { PropsWithChildren } from "react";
import { authClient } from "@/frontend/auth/auth";
import { AuthProvider } from "@/frontend/components/auth/auth-provider";
import { Toaster } from "@/frontend/components/ui/sonner";
import { organizationPlugin } from "@/frontend/lib/auth/organization-plugin";
import { apiClient, EdenProvider } from "@/frontend/lib/eden";
import { getQueryClient } from "@/frontend/lib/query-client";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: PropsWithChildren) {
    const queryClient = getQueryClient();
    const router = useRouter();

    // The marketing surface is pinned to the night canvas, so the product
    // defaults to dark too — otherwise signing in from the landing throws the
    // visitor from a dark page onto a light one. The toggle still works; only
    // the default changed.
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
        >
            <NuqsAdapter>
                <QueryClientProvider client={queryClient}>
                    <EdenProvider client={apiClient} queryClient={queryClient}>
                        <AuthProvider
                            authClient={authClient}
                            redirectTo="/"
                            emailAndPassword={{
                                enabled: true,
                                forgotPassword: true,
                            }}
                            navigate={({ to, replace }) =>
                                replace ? router.replace(to) : router.push(to)
                            }
                            Link={Link}
                            plugins={[organizationPlugin()]}
                        >
                            {children}
                            <Toaster />
                        </AuthProvider>
                    </EdenProvider>
                </QueryClientProvider>
            </NuqsAdapter>
        </ThemeProvider>
    );
}
