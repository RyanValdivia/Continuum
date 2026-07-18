"use client";

import { useEffect, useRef, useState } from "react";
import {
    NODE_TYPE_COLORS,
    nodeRadius,
    PERSON_NODE_COLOR,
    type VizGraph,
    type VizNode,
} from "../viz/graph-viz";

export type GraphApi = { focusNode: (id: string) => void };

export type GraphCanvasProps = {
    graph: VizGraph;
    /** null = no dimming; otherwise ids NOT in the set are dimmed. */
    highlightIds: Set<string> | null;
    onHoverNode: (id: string | null) => void;
    onClickNode: (node: VizNode) => void;
    registerApi: (api: GraphApi | null) => void;
};

// biome-ignore lint/suspicious/noExplicitAny: force-graph's runtime node type carries mutated x/y.
type FgNode = any;
// biome-ignore lint/suspicious/noExplicitAny: dynamic default export from a client-only lib.
type FgComponent = any;

/** Force-graph mutates the arrays it receives; hand it a private clone. */
function cloneForSim(graph: VizGraph) {
    return {
        nodes: graph.nodes.map((n) => ({ ...n })),
        links: graph.links.map((l) => ({ ...l })),
    };
}

export function GraphCanvas({
    graph,
    highlightIds,
    onHoverNode,
    onClickNode,
    registerApi,
}: GraphCanvasProps) {
    const [ForceGraph2D, setForceGraph2D] = useState<FgComponent>(null);
    // biome-ignore lint/suspicious/noExplicitAny: ForceGraphMethods ref shape is internal.
    const fgRef = useRef<any>(null);
    const dataRef = useRef(cloneForSim(graph));
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    // Client-only load — never imported during SSR (touches window).
    useEffect(() => {
        let alive = true;
        import("react-force-graph-2d").then((m) => {
            if (alive) setForceGraph2D(() => m.default);
        });
        return () => {
            alive = false;
        };
    }, []);

    // Re-clone when the (filtered) graph identity changes.
    useEffect(() => {
        dataRef.current = cloneForSim(graph);
    }, [graph]);

    // Track container size for the canvas.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const r = entries[0]?.contentRect;
            if (r) setSize({ width: r.width, height: r.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Expose imperative focus to the explorer.
    useEffect(() => {
        registerApi({
            focusNode: (id: string) => {
                const n = dataRef.current.nodes.find(
                    (x: FgNode) => x.id === id,
                ) as FgNode | undefined;
                const fg = fgRef.current;
                if (n && fg && typeof n.x === "number") {
                    fg.centerAt(n.x, n.y, 600);
                    fg.zoom(3, 600);
                }
            },
        });
        return () => registerApi(null);
    }, [registerApi]);

    return (
        <div ref={containerRef} className="absolute inset-0">
            {ForceGraph2D && size.width > 0 ? (
                <ForceGraph2D
                    ref={fgRef}
                    graphData={dataRef.current}
                    width={size.width}
                    height={size.height}
                    backgroundColor="rgba(0,0,0,0)"
                    cooldownTicks={120}
                    nodeRelSize={1}
                    nodeVal={(n: FgNode) => nodeRadius(n.degree)}
                    linkColor={() => "rgba(148,163,184,0.25)"}
                    linkWidth={(l: FgNode) => Math.max(0.5, l.weight)}
                    linkDirectionalParticles={(l: FgNode) =>
                        l.weight > 1 ? 2 : 0
                    }
                    linkDirectionalParticleWidth={1.5}
                    onNodeHover={(n: FgNode | null) =>
                        onHoverNode(n ? n.id : null)
                    }
                    onNodeClick={(n: FgNode) => onClickNode(n as VizNode)}
                    nodePointerAreaPaint={(
                        n: FgNode,
                        color: string,
                        ctx: CanvasRenderingContext2D,
                    ) => {
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(n.x, n.y, nodeRadius(n.degree), 0, 2 * Math.PI);
                        ctx.fill();
                    }}
                    nodeCanvasObject={(
                        n: FgNode,
                        ctx: CanvasRenderingContext2D,
                        scale: number,
                    ) => {
                        const dim =
                            highlightIds !== null && !highlightIds.has(n.id);
                        const r = nodeRadius(n.degree);
                        const isPerson = n.kind === "person";
                        const color = isPerson
                            ? PERSON_NODE_COLOR
                            : (NODE_TYPE_COLORS[
                                  n.type as keyof typeof NODE_TYPE_COLORS
                              ] ?? "#94a3b8");
                        ctx.globalAlpha = dim ? 0.12 : 1;
                        ctx.beginPath();
                        // Person nodes render as a square, knowledge nodes as
                        // a circle — a shape distinction survives dark-mode
                        // color-blindness better than hue alone.
                        if (isPerson) {
                            ctx.rect(n.x - r, n.y - r, r * 2, r * 2);
                        } else {
                            ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
                        }
                        ctx.fillStyle = color;
                        ctx.shadowColor = color;
                        ctx.shadowBlur = dim ? 0 : 12;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        // Labels only when zoomed in enough and not dimmed.
                        if (!dim && scale > 1.2) {
                            const fontSize = 11 / scale;
                            ctx.font = `${fontSize}px ui-sans-serif, system-ui`;
                            ctx.textAlign = "center";
                            ctx.textBaseline = "top";
                            ctx.fillStyle = "rgba(226,232,240,0.9)";
                            ctx.fillText(n.label, n.x, n.y + r + 1);
                        }
                        ctx.globalAlpha = 1;
                    }}
                />
            ) : null}
        </div>
    );
}
