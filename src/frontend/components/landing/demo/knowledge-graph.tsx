import {
    type Edge,
    type Node,
    type NodeMouseHandler,
    ReactFlow,
    useEdgesState,
    useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect } from "react";
import {
    type GraphNodeData,
    INITIAL_NODES,
    knowledgeNodeId,
    PUESTO_IDS,
    PUESTOS,
    type PuestoId,
} from "./graph-data";
import { HubNode, KnowledgeNode, PuestoNode } from "./nodes";

const nodeTypes = {
    puesto: PuestoNode,
    knowledge: KnowledgeNode,
    hub: HubNode,
};

type Props = {
    active: PuestoId | null;
    onHover: (id: PuestoId | null) => void;
    onSelect: (id: PuestoId | null) => void;
};

function buildEdges(active: PuestoId | null): Edge[] {
    const dimStroke = {
        stroke: "var(--muted-foreground)",
        strokeWidth: 1.5,
        strokeOpacity: active ? 0.12 : 0.4,
    };
    const puestoHub: Edge[] = PUESTO_IDS.map((id) => {
        const on = active === id;
        return {
            id: `${id}-hub`,
            source: id,
            target: "hub",
            animated: on,
            style: on
                ? { stroke: "var(--primary)", strokeWidth: 2, strokeOpacity: 1 }
                : dimStroke,
        };
    });
    if (!active) return puestoHub;
    const knowledge: Edge[] = PUESTOS[active].knowledge.map((_, i) => ({
        id: `${active}-k${i}`,
        source: active,
        target: knowledgeNodeId(i),
        animated: true,
        style: { stroke: "var(--primary)", strokeWidth: 2, strokeOpacity: 0.9 },
    }));
    return [...puestoHub, ...knowledge];
}

export function KnowledgeGraph({ active, onHover, onSelect }: Props) {
    const [nodes, setNodes, onNodesChange] =
        useNodesState<Node<GraphNodeData>>(INITIAL_NODES);
    const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(null));

    useEffect(() => {
        setNodes((current) =>
            current.map((node) => {
                if (node.data.kind === "puesto") {
                    const state = !active
                        ? "default"
                        : node.data.puesto === active
                          ? "active"
                          : "dim";
                    return { ...node, data: { ...node.data, state } };
                }
                if (node.data.kind === "hub") {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            state: active ? "active" : "default",
                        },
                    };
                }
                // knowledge slot: reused for the active puesto
                const index = Number(node.id.split("-")[1]);
                const item = active ? PUESTOS[active].knowledge[index] : null;
                return {
                    ...node,
                    hidden: !item,
                    data: item
                        ? {
                              kind: "knowledge" as const,
                              tipo: item.tipo,
                              label: item.label,
                              state: "active" as const,
                          }
                        : node.data,
                };
            }),
        );
        setEdges(buildEdges(active));
    }, [active, setNodes, setEdges]);

    const enter = useCallback<NodeMouseHandler>(
        (_, node) => {
            if (node.type === "puesto") onHover(node.id as PuestoId);
        },
        [onHover],
    );
    const leave = useCallback(() => onHover(null), [onHover]);
    const click = useCallback<NodeMouseHandler>(
        (_, node) => {
            if (node.type === "puesto") onSelect(node.id as PuestoId);
        },
        [onSelect],
    );
    const clearSelection = useCallback(() => onSelect(null), [onSelect]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeMouseEnter={enter}
            onNodeMouseLeave={leave}
            onNodeClick={click}
            onPaneClick={clearSelection}
            onInit={(instance) =>
                instance.fitBounds(
                    { x: -20, y: -20, width: 900, height: 470 },
                    { padding: 0.06 },
                )
            }
            minZoom={0.3}
            maxZoom={1.5}
            zoomOnScroll={false}
            panOnScroll={false}
            preventScrolling={false}
            zoomOnDoubleClick={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
            className="h-full w-full"
            style={{ background: "transparent" }}
        />
    );
}
