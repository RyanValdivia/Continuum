"use client";

import { Waypoints } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { NodeType } from "@/core/knowledge/domain/types";
import { Spinner } from "@/frontend/components/ui/spinner";
import {
    distinctPersonIds,
    filterByPerson,
    filterByTypes,
    filterPeople,
    matchNodeByLabel,
    NODE_TYPES,
    neighborIds,
    type VizNode,
} from "../viz/graph-viz";
import { useGraphQuery } from "../viz/use-graph-query";
import { type GraphApi, GraphCanvas } from "./graph-canvas";
import { GraphLegend } from "./graph-legend";
import { GraphPersonFilter } from "./graph-person-filter";
import { GraphSearch } from "./graph-search";
import { NodeDetailPanel } from "./node-detail-panel";

/**
 * Full-canvas explorer for the org's knowledge graph. Fetches one bounded slice
 * and drives the force constellation + its controls (legend, search, person
 * scope, detail panel). All filtering/highlight is computed client-side.
 */
export function KnowledgeGraphExplorer() {
    // Always fetch the full slice; person scope is applied client-side so the
    // person dropdown keeps every person even after one is selected.
    const { data, isLoading, isError } = useGraphQuery(null);

    const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(
        () => new Set(NODE_TYPES),
    );
    const [showPeople, setShowPeople] = useState(true);
    const [personId, setPersonId] = useState<string | null>(null);
    const [hoverId, setHoverId] = useState<string | null>(null);
    const [selected, setSelected] = useState<VizNode | null>(null);
    const apiRef = useRef<GraphApi | null>(null);

    const registerApi = useCallback((api: GraphApi | null) => {
        apiRef.current = api;
    }, []);

    const toggleType = useCallback((type: NodeType) => {
        setActiveTypes((prev) => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type);
            else next.add(type);
            // Never allow zero types (nothing to show); keep at least one.
            return next.size === 0 ? prev : next;
        });
    }, []);

    // Person options come from the FULL slice, not the filtered one.
    const personIds = useMemo(
        () => (data ? distinctPersonIds(data.nodes) : []),
        [data],
    );

    // Person scope, then type filter, then the people-visibility toggle.
    const filtered = useMemo(() => {
        if (!data) return null;
        return filterPeople(
            filterByTypes(filterByPerson(data, personId), activeTypes),
            showPeople,
        );
    }, [data, personId, activeTypes, showPeople]);

    const highlightIds = useMemo(() => {
        if (!hoverId || !filtered) return null;
        const set = neighborIds(filtered.links, hoverId);
        set.add(hoverId);
        return set;
    }, [hoverId, filtered]);

    const onSearch = useCallback(
        (query: string) => {
            if (!filtered) return;
            const match = matchNodeByLabel(filtered.nodes, query);
            if (match) {
                setHoverId(match.id); // reuse the highlight path
                apiRef.current?.focusNode(match.id);
            }
        },
        [filtered],
    );

    const onSelectNeighbor = useCallback(
        (id: string) => {
            const n = filtered?.nodes.find((x) => x.id === id);
            if (n) {
                setSelected(n);
                apiRef.current?.focusNode(id);
            }
        },
        [filtered],
    );

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

    const graph = filtered ?? data;

    return (
        <div className="relative h-[calc(100svh-4rem)] w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.4),transparent)]">
            <GraphLegend
                active={activeTypes}
                onToggle={toggleType}
                showPeople={showPeople}
                onTogglePeople={() => setShowPeople((v) => !v)}
            />
            <GraphSearch onSubmit={onSearch} />
            <GraphPersonFilter
                personIds={personIds}
                value={personId}
                onChange={setPersonId}
            />
            <GraphCanvas
                graph={graph}
                highlightIds={highlightIds}
                onHoverNode={setHoverId}
                onClickNode={setSelected}
                registerApi={registerApi}
            />
            <NodeDetailPanel
                node={selected}
                graph={graph}
                onClose={() => setSelected(null)}
                onSelectNeighbor={onSelectNeighbor}
            />
        </div>
    );
}
