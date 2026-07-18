"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/frontend/components/ui/button";
import {
    NODE_TYPE_COLORS,
    NODE_TYPE_LABELS,
    neighborIds,
    PERSON_NODE_COLOR,
    PERSON_NODE_LABEL,
    type VizGraph,
    type VizNode,
} from "../viz/graph-viz";

export function NodeDetailPanel({
    node,
    graph,
    onClose,
    onSelectNeighbor,
}: {
    node: VizNode | null;
    graph: VizGraph;
    onClose: () => void;
    onSelectNeighbor: (id: string) => void;
}) {
    return (
        <AnimatePresence>
            {node ? (
                <motion.aside
                    key={node.id}
                    initial={{ x: 320, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 320, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 34 }}
                    className="absolute top-4 right-4 bottom-4 z-20 flex w-80 flex-col gap-3 overflow-y-auto rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span
                                className={
                                    node.kind === "person"
                                        ? "size-3"
                                        : "size-3 rounded-full"
                                }
                                style={{
                                    backgroundColor:
                                        node.kind === "person"
                                            ? PERSON_NODE_COLOR
                                            : NODE_TYPE_COLORS[node.type],
                                }}
                            />
                            <span className="text-muted-foreground text-xs uppercase tracking-wide">
                                {node.kind === "person"
                                    ? PERSON_NODE_LABEL
                                    : NODE_TYPE_LABELS[node.type]}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={onClose}
                        >
                            <X className="size-4" />
                            <span className="sr-only">Cerrar</span>
                        </Button>
                    </div>

                    <h2 className="font-semibold text-foreground text-sm leading-tight">
                        {node.label}
                    </h2>

                    {node.kind === "knowledge" && node.summary ? (
                        <p className="text-muted-foreground text-sm">
                            {node.summary}
                        </p>
                    ) : null}

                    {node.kind === "knowledge" ? (
                        <dl className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <dt className="text-muted-foreground">
                                    Origen
                                </dt>
                                <dd className="text-foreground">
                                    {node.origin}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Confianza
                                </dt>
                                <dd className="text-foreground">
                                    {Math.round(node.confidence * 100)}%
                                </dd>
                            </div>
                        </dl>
                    ) : null}

                    <NeighborList
                        graph={graph}
                        nodeId={node.id}
                        onSelect={onSelectNeighbor}
                    />
                </motion.aside>
            ) : null}
        </AnimatePresence>
    );
}

function NeighborList({
    graph,
    nodeId,
    onSelect,
}: {
    graph: VizGraph;
    nodeId: string;
    onSelect: (id: string) => void;
}) {
    const ids = neighborIds(graph.links, nodeId);
    const neighbors = graph.nodes.filter((n) => ids.has(n.id));
    if (neighbors.length === 0) return null;
    return (
        <div className="mt-1">
            <p className="mb-1.5 text-muted-foreground text-xs">
                Conexiones ({neighbors.length})
            </p>
            <ul className="flex flex-col gap-1">
                {neighbors.map((n) => (
                    <li key={n.id}>
                        <button
                            type="button"
                            onClick={() => onSelect(n.id)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                        >
                            <span
                                className="size-2 shrink-0 rounded-full"
                                style={{
                                    backgroundColor:
                                        n.kind === "person"
                                            ? PERSON_NODE_COLOR
                                            : NODE_TYPE_COLORS[n.type],
                                }}
                            />
                            <span className="truncate text-foreground">
                                {n.label}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
