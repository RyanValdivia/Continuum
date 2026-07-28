"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/frontend/lib/utils";

type Burst = { id: number; x: number; y: number };

/**
 * The primary action. Hum's push metaphor — lifts on hover, presses down on
 * activate — plus the star-burst micro-celebration, fired once per press from
 * the press point. Both collapse to nothing under reduced motion (handled in
 * `globals.css`), so the button stays fully usable without them.
 */
export function CtaButton({
    href,
    children,
    className,
}: {
    href: string;
    children: React.ReactNode;
    className?: string;
}) {
    const [bursts, setBursts] = useState<Burst[]>([]);
    const nextId = useRef(0);

    const spark = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const id = nextId.current++;
        setBursts((current) => [
            ...current,
            {
                id,
                x: event.clientX - rect.left - 12,
                y: event.clientY - rect.top - 12,
            },
        ]);
        window.setTimeout(
            () => setBursts((current) => current.filter((b) => b.id !== id)),
            460,
        );
    }, []);

    return (
        <Link
            href={href}
            onClick={spark}
            className={cn(
                "btn-push group relative isolate inline-flex min-h-11 items-center gap-2 overflow-visible whitespace-nowrap px-6 font-medium text-sm outline-none",
                className,
            )}
        >
            {children}
            <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:translate-x-1"
            />
            {bursts.map((burst) => (
                <span
                    key={burst.id}
                    aria-hidden
                    className="star-burst"
                    style={{ left: burst.x, top: burst.y }}
                />
            ))}
        </Link>
    );
}
