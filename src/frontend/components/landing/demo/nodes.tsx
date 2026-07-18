import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { Compass, FileText, GitBranch, type LucideIcon } from "lucide-react";
import { cn } from "@/frontend/lib/utils";
import {
    type HubNodeData,
    type KnowledgeNodeData,
    type KnowledgeTipo,
    type PuestoNodeData,
    TIPO_LABEL,
} from "./graph-data";

const HIDDEN_HANDLE =
    "!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-transparent opacity-0";

const TIPO_ICON: Record<KnowledgeTipo, LucideIcon> = {
    documento: FileText,
    decision: GitBranch,
    criterio: Compass,
};

export function PuestoNode({
    data,
}: NodeProps<Node<PuestoNodeData, "puesto">>) {
    const active = data.state === "active";
    return (
        <div
            className={cn(
                "flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2 shadow-sm transition-all",
                data.state === "dim" ? "opacity-35" : "opacity-100",
                active && "border-primary ring-2 ring-primary/30",
            )}
        >
            <Handle
                type="target"
                position={Position.Left}
                className={HIDDEN_HANDLE}
            />
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 font-semibold text-primary text-xs">
                {data.initial}
            </span>
            <div className="pr-1 text-left">
                <p className="font-medium text-foreground text-sm leading-tight">
                    {data.label}
                </p>
                <p className="text-[11px] text-muted-foreground">Agente</p>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                className={HIDDEN_HANDLE}
            />
        </div>
    );
}

export function KnowledgeNode({
    data,
}: NodeProps<Node<KnowledgeNodeData, "knowledge">>) {
    const Icon = TIPO_ICON[data.tipo];
    return (
        <div
            className={cn(
                "flex max-w-[180px] items-start gap-2 rounded-lg border bg-card px-2.5 py-2 shadow-sm transition-all",
                data.state === "dim" ? "opacity-35" : "opacity-100",
                data.state === "active" && "border-primary/40",
            )}
        >
            <Handle
                type="target"
                position={Position.Left}
                className={HIDDEN_HANDLE}
            />
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-3.5" />
            </span>
            <div className="text-left">
                <p className="font-medium text-[9px] text-muted-foreground uppercase tracking-wide">
                    {TIPO_LABEL[data.tipo]}
                </p>
                <p className="font-medium text-foreground text-xs leading-tight">
                    {data.label}
                </p>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                className={HIDDEN_HANDLE}
            />
        </div>
    );
}

export function HubNode({ data }: NodeProps<Node<HubNodeData, "hub">>) {
    return (
        <div
            className={cn(
                "rounded-2xl bg-primary px-4 py-3 text-center text-primary-foreground shadow-md transition-all",
                data.state === "dim" && "opacity-60",
            )}
        >
            <Handle
                type="target"
                position={Position.Left}
                className={HIDDEN_HANDLE}
            />
            <p className="font-semibold text-sm leading-none">Continuum</p>
            <p className="mt-1 text-[10px] opacity-80">Memoria viva</p>
            <Handle
                type="source"
                position={Position.Right}
                className={HIDDEN_HANDLE}
            />
        </div>
    );
}
