import { cn } from "@/frontend/lib/utils";

/**
 * Continuum brand mark — two connected ring nodes and a solid node forming a "C".
 * Vector, transparent background, inherits color via `currentColor`.
 */
export function ContinuumLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 200 196"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Continuum"
            className={cn("text-primary", className)}
        >
            {/* solid node */}
            <circle cx="36" cy="98" r="28" fill="currentColor" />
            {/* top ring node */}
            <circle
                cx="160"
                cy="40"
                r="20"
                stroke="currentColor"
                strokeWidth="15"
            />
            {/* bottom ring node */}
            <circle
                cx="160"
                cy="156"
                r="20"
                stroke="currentColor"
                strokeWidth="15"
            />
            {/* top connector */}
            <path
                d="M56 66 C72 44 116 37 135 47"
                stroke="currentColor"
                strokeWidth="15"
                strokeLinecap="round"
            />
            {/* bottom connector */}
            <path
                d="M56 130 C72 152 116 159 135 149"
                stroke="currentColor"
                strokeWidth="15"
                strokeLinecap="round"
            />
        </svg>
    );
}
