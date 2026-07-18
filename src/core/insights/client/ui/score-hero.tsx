import type { ScoreBreakdown } from "@/core/insights/domain/score";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { cn } from "@/frontend/lib/utils";
import { BAND_STYLE } from "./band";

/**
 * The headline: the Knowledge Continuity Score and its Bus Factor — the two
 * numbers that tell the continuity-risk story at a glance.
 */
export function ScoreHero({ score }: { score: ScoreBreakdown }) {
    const band = BAND_STYLE[score.band];

    return (
        <Card>
            <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col justify-center">
                    <span className="text-muted-foreground text-sm">
                        Knowledge Continuity Score
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-semibold text-5xl tabular-nums tracking-tight">
                            {score.score}
                        </span>
                        <span className="text-muted-foreground text-xl">
                            / 100
                        </span>
                    </div>
                    <div
                        className={cn(
                            "mt-2 flex items-center gap-2",
                            band.text,
                        )}
                    >
                        <span className={cn("size-2 rounded-full", band.dot)} />
                        <span className="font-medium text-sm">
                            {band.label}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col justify-center border-t pt-6 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                    <span className="text-muted-foreground text-sm">
                        Bus Factor
                    </span>
                    <span className="mt-1 font-semibold text-5xl tabular-nums tracking-tight">
                        {score.busFactor}
                    </span>
                    <p className="mt-2 text-muted-foreground text-sm">
                        {score.busFactor === 0
                            ? "Sin conocimiento crítico concentrado."
                            : `Si se van ${score.busFactor} persona${score.busFactor === 1 ? "" : "s"}, la empresa pierde conocimiento crítico.`}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
