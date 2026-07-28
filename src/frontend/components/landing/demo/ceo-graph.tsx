"use client";

import { useCallback, useMemo, useState } from "react";
import {
    type GraphApi,
    GraphCanvas,
} from "@/core/knowledge/client/ui/graph-canvas";
import { NodeDetailPanel } from "@/core/knowledge/client/ui/node-detail-panel";
import {
    computeDegree,
    NODE_TYPE_COLORS,
    NODE_TYPE_LABELS,
    neighborIds,
    type VizGraph,
    type VizLink,
    type VizNode,
} from "@/core/knowledge/client/viz/graph-viz";

/**
 * The landing demo runs the *same* renderer the product ships at
 * `/[slug]/app/graph` — `GraphCanvas` (react-force-graph-2d) plus the real
 * `NodeDetailPanel` — so what a visitor touches here is the actual component,
 * not a mock-up of it.
 *
 * The data is a curated sample: one CEO at the centre with the decisions,
 * processes and documents that hang off that seat.
 */
const CEO_ID = "ceo";

type Seed = Omit<VizNode, "degree">;

const SEEDS: Seed[] = [
    {
        id: CEO_ID,
        label: "Elena Ruiz · CEO",
        type: "person",
        origin: "manual",
        confidence: 1,
        summary:
            "Fundadora. Sostiene la estrategia, el precio y la relación con el board.",
        personId: CEO_ID,
    },
    {
        id: "d-ronda",
        label: "No levantar ronda hasta 2027",
        type: "decision",
        origin: "interview",
        confidence: 0.94,
        summary:
            "Crecer con caja propia mientras el margen bruto se mantenga sobre el 70 %.",
        personId: CEO_ID,
    },
    {
        id: "d-precio",
        label: "Precio por asiento, no por uso",
        type: "decision",
        origin: "sync",
        confidence: 0.88,
        summary:
            "El cobro por uso hacía impredecible la factura del cliente y frenaba la adopción interna.",
        personId: CEO_ID,
    },
    {
        id: "c-margen",
        label: "Margen antes que crecimiento",
        type: "concept",
        origin: "interview",
        confidence: 0.91,
        summary:
            "El criterio que decide cuando una oportunidad de ingreso compite con la rentabilidad.",
        personId: CEO_ID,
    },
    {
        id: "p-comite",
        label: "Comité de producto quincenal",
        type: "process",
        origin: "sync",
        confidence: 0.83,
        summary:
            "Cada dos semanas se revisa el plan de producto contra las decisiones vigentes.",
        personId: CEO_ID,
    },
    {
        id: "doc-plan",
        label: "Plan estratégico 2026",
        type: "document",
        origin: "sync",
        confidence: 0.79,
        summary:
            "Notion · actualizado hace 6 días. La fuente de la que salen las dos decisiones de arriba.",
        personId: CEO_ID,
    },
    {
        id: "doc-board",
        label: "Acta de board · Q2",
        type: "document",
        origin: "sync",
        confidence: 0.72,
        summary:
            "Microsoft 365 · donde quedó registrada la decisión sobre la ronda.",
        personId: CEO_ID,
    },
    {
        id: "v-eng",
        label: "Head of Engineering",
        type: "vacancy",
        origin: "manual",
        confidence: 0.65,
        summary:
            "Puesto abierto. El grafo ya sabe qué decisiones tendrá que sostener quien lo ocupe.",
        personId: null,
    },
    {
        id: "p-sales",
        label: "Head of Sales",
        type: "person",
        origin: "sync",
        confidence: 0.9,
        summary:
            "Hereda el criterio de precio: el tope de descuento sale de la decisión de la CEO.",
        personId: "p-sales",
    },
];

const LINKS: VizLink[] = [
    { source: CEO_ID, target: "d-ronda", type: "relates_to", weight: 2 },
    { source: CEO_ID, target: "d-precio", type: "relates_to", weight: 2 },
    { source: CEO_ID, target: "c-margen", type: "relates_to", weight: 2 },
    { source: CEO_ID, target: "p-comite", type: "part_of", weight: 1 },
    { source: CEO_ID, target: "v-eng", type: "relates_to", weight: 1 },
    { source: "d-ronda", target: "doc-board", type: "references", weight: 1 },
    { source: "d-ronda", target: "c-margen", type: "depends_on", weight: 2 },
    { source: "d-precio", target: "doc-plan", type: "references", weight: 1 },
    { source: "d-precio", target: "p-sales", type: "relates_to", weight: 2 },
    { source: "c-margen", target: "doc-plan", type: "references", weight: 1 },
    { source: "p-comite", target: "doc-plan", type: "references", weight: 1 },
];

function buildGraph(compact: boolean): VizGraph {
    if (!compact) {
        const degree = computeDegree(SEEDS, LINKS);
        return {
            nodes: SEEDS.map((n) => ({ ...n, degree: degree.get(n.id) ?? 0 })),
            links: LINKS,
        };
    }
    // The hero portrait is a small card: the CEO and her direct connections
    // only, so the force layout has room to separate the labels.
    const keep = neighborIds(LINKS, CEO_ID);
    keep.add(CEO_ID);
    const links = LINKS.filter((l) => keep.has(l.source) && keep.has(l.target));
    const nodes = SEEDS.filter((n) => keep.has(n.id));
    const degree = computeDegree(nodes, links);
    return {
        nodes: nodes.map((n) => ({ ...n, degree: degree.get(n.id) ?? 0 })),
        links,
    };
}

export function CeoGraph({
    interactive = true,
    heightClass = "h-[24rem] sm:h-[30rem]",
}: {
    interactive?: boolean;
    heightClass?: string;
}) {
    const graph = useMemo(() => buildGraph(!interactive), [interactive]);
    const [hoverId, setHoverId] = useState<string | null>(null);
    const [selected, setSelected] = useState<VizNode | null>(
        () => graph.nodes.find((n) => n.id === CEO_ID) ?? null,
    );

    const highlightIds = useMemo(() => {
        if (!hoverId) return null;
        const set = neighborIds(graph.links, hoverId);
        set.add(hoverId);
        return set;
    }, [graph.links, hoverId]);

    const registerApi = useCallback((_api: GraphApi | null) => {
        // The landing doesn't drive the canvas imperatively; the panel is
        // enough. Kept so the canvas contract stays satisfied.
    }, []);

    const selectById = useCallback(
        (id: string) => {
            setSelected(graph.nodes.find((n) => n.id === id) ?? null);
        },
        [graph.nodes],
    );

    return (
        <div className="min-w-0">
            <div
                className={`lumen-card relative overflow-hidden ${heightClass}`}
            >
                <div
                    className={interactive ? undefined : "pointer-events-none"}
                >
                    <GraphCanvas
                        graph={graph}
                        highlightIds={highlightIds}
                        onHoverNode={interactive ? setHoverId : () => {}}
                        onClickNode={interactive ? setSelected : () => {}}
                        registerApi={registerApi}
                    />
                </div>

                {interactive ? (
                    <div className="hidden sm:block">
                        <NodeDetailPanel
                            node={selected}
                            graph={graph}
                            onClose={() => setSelected(null)}
                            onSelectNeighbor={selectById}
                        />
                    </div>
                ) : null}
            </div>

            {interactive ? (
                <>
                    <p className="mt-[var(--space-md)] text-muted-foreground text-sm">
                        Pasa el cursor para aislar un nodo y sus conexiones. Haz
                        clic en cualquiera para abrir su ficha.
                    </p>

                    {/* Below 40rem the side panel would cover the canvas, so the
                        same information is listed instead — and the list doubles
                        as the keyboard route into the graph. */}
                    <ul className="mt-[var(--space-lg)] grid gap-2 sm:hidden">
                        {graph.nodes.map((node) => (
                            <li key={node.id}>
                                <button
                                    type="button"
                                    onClick={() => selectById(node.id)}
                                    aria-pressed={selected?.id === node.id}
                                    className="flex min-h-11 w-full items-center gap-2.5 rounded-full border border-border px-3 text-left text-sm outline-none transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:bg-card"
                                >
                                    <span
                                        aria-hidden
                                        className="size-2 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor:
                                                NODE_TYPE_COLORS[node.type],
                                        }}
                                    />
                                    <span className="min-w-0 truncate text-foreground">
                                        {node.label}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>

                    {selected ? (
                        <div className="lumen-card mt-[var(--space-md)] p-[var(--space-lg)] sm:hidden">
                            <p className="font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.12em]">
                                {NODE_TYPE_LABELS[selected.type]}
                            </p>
                            <p className="mt-1 text-foreground text-sm">
                                {selected.label}
                            </p>
                            {selected.summary ? (
                                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                                    {selected.summary}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
