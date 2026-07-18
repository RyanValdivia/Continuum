import type { ScoreBreakdown } from "@/core/insights/domain/score";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";
import { cn } from "@/frontend/lib/utils";
import { pct } from "./band";

/** Spread is the inverse of concentration — higher is better, like the others. */
function Bar({
    label,
    ratio,
    hint,
}: {
    label: string;
    ratio: number;
    hint: string;
}) {
    return (
        <div>
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="tabular-nums text-muted-foreground">
                    {pct(ratio)}
                </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                    className={cn(
                        "h-full rounded-full",
                        ratio >= 0.75
                            ? "bg-emerald-500"
                            : ratio >= 0.5
                              ? "bg-amber-500"
                              : "bg-red-500",
                    )}
                    style={{ width: pct(Math.max(0, Math.min(1, ratio))) }}
                />
            </div>
            <p className="mt-1 text-muted-foreground text-xs">{hint}</p>
        </div>
    );
}

export function ComponentBars({ score }: { score: ScoreBreakdown }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    De qué se compone el score
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <Bar
                    label="Cobertura"
                    ratio={score.coverage}
                    hint="Personas cuyo conocimiento ya está capturado."
                />
                <Bar
                    label="Reparto"
                    ratio={1 - score.concentration}
                    hint="Qué tan poco depende el conocimiento de una sola persona."
                />
                <Bar
                    label="Conectividad"
                    ratio={score.connectivity}
                    hint="Nodos enlazados en el grafo, no islas sueltas."
                />
            </CardContent>
        </Card>
    );
}
