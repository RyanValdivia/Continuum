import { Waypoints } from "lucide-react";
import Link from "next/link";
import type { DashboardData } from "@/core/insights/domain/types";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { ComponentBars } from "./component-bars";
import { KeyPeople } from "./key-people";
import { ScoreHero } from "./score-hero";
import { TopRisks } from "./top-risks";

function Tile({ label, value }: { label: string; value: number }) {
    return (
        <Card className="py-4">
            <CardContent className="px-4">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="mt-1 font-semibold text-2xl tabular-nums">
                    {value}
                </p>
            </CardContent>
        </Card>
    );
}

/** Composes the full dashboard read model into the pantalla-1 layout. */
export function Dashboard({
    data,
    slug,
}: {
    data: DashboardData;
    slug: string;
}) {
    const { totals } = data;

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
            <ScoreHero score={data.score} />

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Tile label="Miembros" value={totals.members} />
                <Tile label="Documentos" value={totals.documents} />
                <Tile label="Nodos" value={totals.nodes} />
                <Tile label="Conexiones" value={totals.edges} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <ComponentBars score={data.score} />
                <TopRisks risks={data.topRisks} />
            </div>

            <KeyPeople people={data.keyPeople} slug={slug} />

            <Link
                href={`/${slug}/app/graph`}
                className="flex items-center justify-between rounded-xl border bg-card px-6 py-4 text-sm shadow-sm transition-colors hover:bg-accent"
            >
                <span className="flex items-center gap-2 font-medium">
                    <Waypoints className="size-4 text-primary" />
                    Explorar el grafo de conocimiento
                </span>
                <span className="text-muted-foreground">Ver grafo →</span>
            </Link>
        </div>
    );
}
