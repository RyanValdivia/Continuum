import { AlertTriangle } from "lucide-react";
import type { PersonRisk } from "@/core/insights/domain/types";
import { Badge } from "@/frontend/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";

/** Single points of failure: people who solely hold critical knowledge. */
export function TopRisks({ risks }: { risks: PersonRisk[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="size-4 text-amber-500" />
                    Mayores riesgos
                </CardTitle>
            </CardHeader>
            <CardContent>
                {risks.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Ninguna persona concentra conocimiento crítico. 🎉
                    </p>
                ) : (
                    <ul className="grid gap-3">
                        {risks.map((risk) => (
                            <li
                                key={risk.memberId}
                                className="flex items-start justify-between gap-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-sm">
                                        {risk.name}
                                    </p>
                                    <p className="truncate text-muted-foreground text-xs">
                                        {risk.areas.join(" · ") ||
                                            "Áreas exclusivas"}
                                    </p>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="shrink-0 tabular-nums"
                                >
                                    {risk.exclusiveCount} exclusiva
                                    {risk.exclusiveCount === 1 ? "" : "s"}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
