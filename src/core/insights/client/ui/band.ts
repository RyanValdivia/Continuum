import type { RiskBand } from "@/core/insights/domain/score";

/** Presentation for each health band — Spanish label + Tailwind color tokens. */
export const BAND_STYLE: Record<
    RiskBand,
    { label: string; text: string; dot: string; bar: string }
> = {
    low: {
        label: "Riesgo Bajo",
        text: "text-emerald-600 dark:text-emerald-400",
        dot: "bg-emerald-500",
        bar: "bg-emerald-500",
    },
    medium: {
        label: "Riesgo Medio",
        text: "text-amber-600 dark:text-amber-400",
        dot: "bg-amber-500",
        bar: "bg-amber-500",
    },
    high: {
        label: "Riesgo Alto",
        text: "text-red-600 dark:text-red-400",
        dot: "bg-red-500",
        bar: "bg-red-500",
    },
};

export const pct = (ratio: number): string => `${Math.round(ratio * 100)}%`;
