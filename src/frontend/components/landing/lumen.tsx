import type { PropsWithChildren } from "react";
import { cn } from "@/frontend/lib/utils";

/**
 * The label register — mono, UPPERCASE, tracked. The only uppercase surface on
 * the page; everything else is sentence case.
 */
export function Label({
    className,
    children,
}: PropsWithChildren<{ className?: string }>) {
    return (
        <span
            className={cn(
                "font-mono text-[0.6875rem] uppercase tracking-[0.12em]",
                className,
            )}
        >
            {children}
        </span>
    );
}

/** A dot + label pill. The rail chips and the meta chips share this shape. */
export function Chip({
    tone = "muted",
    className,
    children,
}: PropsWithChildren<{
    tone?: "muted" | "primary" | "chord";
    className?: string;
}>) {
    const dot =
        tone === "primary"
            ? "bg-primary"
            : tone === "chord"
              ? "bg-brand-chord"
              : "bg-muted-foreground";
    return (
        <span
            className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5",
                className,
            )}
        >
            <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
            <Label className="text-muted-foreground">{children}</Label>
        </span>
    );
}

/**
 * Ordinal eyebrow stacked directly above its heading, single column — the
 * tag-left / heading-right arrangement is the templated-editorial tell.
 */
export function SectionHead({
    ordinal,
    kicker,
    title,
    lede,
    align = "left",
    className,
}: {
    ordinal?: string;
    kicker: string;
    title: React.ReactNode;
    lede?: React.ReactNode;
    align?: "left" | "center";
    className?: string;
}) {
    const centered = align === "center";
    return (
        <div
            className={cn(
                "grid gap-[var(--space-md)]",
                centered && "justify-items-center text-center",
                className,
            )}
        >
            <span className="inline-flex items-center gap-2">
                <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-primary"
                />
                <Label className="text-muted-foreground">
                    {ordinal ? `${ordinal} · ` : ""}
                    {kicker}
                </Label>
            </span>
            <h2
                className={cn(
                    "font-display text-[length:var(--text-display-s)] text-foreground leading-[1.05] tracking-[-0.025em]",
                    centered ? "max-w-[24ch]" : "max-w-[22ch]",
                )}
            >
                {title}
            </h2>
            {lede ? (
                <p className="max-w-[54ch] text-lg text-muted-foreground leading-relaxed">
                    {lede}
                </p>
            ) : null}
        </div>
    );
}
