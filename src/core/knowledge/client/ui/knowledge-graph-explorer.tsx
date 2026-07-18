"use client";

import { Waypoints } from "lucide-react";
import { Spinner } from "@/frontend/components/ui/spinner";
import { useGraphQuery } from "../viz/use-graph-query";

/**
 * Full-canvas explorer for the org's knowledge graph. Owns fetch + interaction
 * state; renders the force constellation and its controls (added in later tasks).
 */
export function KnowledgeGraphExplorer() {
    const { data, isLoading, isError } = useGraphQuery(null);

    if (isLoading) {
        return (
            <div className="grid h-[calc(100svh-4rem)] place-items-center">
                <Spinner />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="grid h-[calc(100svh-4rem)] place-items-center text-muted-foreground text-sm">
                No se pudo cargar el grafo. Intenta de nuevo.
            </div>
        );
    }

    if (!data || data.nodes.length === 0) {
        return (
            <div className="flex h-[calc(100svh-4rem)] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Waypoints className="size-10" />
                <div>
                    <p className="font-medium text-foreground">
                        Aún no hay conocimiento en el grafo
                    </p>
                    <p className="text-sm">
                        Sincroniza una fuente para empezar a ver conexiones.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-[calc(100svh-4rem)] w-full overflow-hidden">
            {/* canvas + controls mount here in later tasks */}
            <div className="grid h-full place-items-center text-muted-foreground text-sm">
                {data.nodes.length} nodos · {data.links.length} conexiones
            </div>
        </div>
    );
}
