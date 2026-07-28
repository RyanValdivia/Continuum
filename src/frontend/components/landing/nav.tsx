"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ContinuumLogo } from "@/frontend/components/landing/logo";
import { cn } from "@/frontend/lib/utils";

const LINKS = [
    { href: "#etapas", label: "Cómo funciona" },
    { href: "#grafo", label: "El grafo" },
    { href: "#fuentes", label: "Fuentes" },
    { href: "#comparativa", label: "Comparativa" },
];

/**
 * N10 · Floating-on-scroll morph. One DOM, two visual modes: a flush bar at the
 * top of the page that detaches into a floating pill once the reader has moved
 * past the fold.
 */
export function LandingNav() {
    const [floating, setFloating] = useState(false);

    useEffect(() => {
        const onScroll = () => setFloating(window.scrollY > 24);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header
            className={cn(
                "sticky top-0 z-[var(--z-sticky)] transition-[padding] duration-[var(--dur-long)] ease-[var(--ease-out)]",
                floating
                    ? "px-[var(--space-md)] pt-[var(--space-md)]"
                    : "px-0 pt-0",
            )}
        >
            <nav
                className={cn(
                    "mx-auto flex items-center justify-between gap-[var(--space-lg)] px-[var(--page-gutter)] py-3 transition-[background-color,border-color,border-radius,box-shadow,max-width] duration-[var(--dur-long)] ease-[var(--ease-out)]",
                    floating
                        ? "max-w-[68rem] rounded-full border border-border bg-card shadow-[0_10px_30px_-12px_rgb(0_0_0/0.55)]"
                        : "max-w-[var(--page-max)] rounded-none border border-transparent border-b-border bg-transparent",
                )}
            >
                <Link
                    href="/"
                    className="flex shrink-0 items-center gap-2.5 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4"
                >
                    <ContinuumLogo className="h-5 w-auto text-primary" />
                    <span className="whitespace-nowrap font-display text-foreground text-xl leading-none">
                        Continuum
                    </span>
                </Link>

                <div className="hidden items-center gap-[var(--space-lg)] lg:flex">
                    {LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="whitespace-nowrap rounded-full px-1 text-muted-foreground text-sm outline-none transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4 active:text-foreground"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="flex shrink-0 items-center gap-[var(--space-md)]">
                    <Link
                        href="/auth/sign-in"
                        className="hidden whitespace-nowrap rounded-full text-muted-foreground text-sm outline-none transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4 sm:inline-flex"
                    >
                        Entrar
                    </Link>
                    <Link
                        href="/auth/sign-in"
                        className="btn-push inline-flex min-h-9 items-center whitespace-nowrap px-4 font-medium text-sm outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4"
                    >
                        Empezar
                    </Link>
                </div>
            </nav>
        </header>
    );
}
