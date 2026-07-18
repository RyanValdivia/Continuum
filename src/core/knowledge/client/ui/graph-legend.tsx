"use client";

import type { NodeType } from "@/core/knowledge/domain/types";
import { cn } from "@/frontend/lib/utils";
import {
    NODE_TYPE_COLORS,
    NODE_TYPE_LABELS,
    NODE_TYPES,
} from "../viz/graph-viz";

export function GraphLegend({
    active,
    onToggle,
}: {
    active: Set<NodeType>;
    onToggle: (type: NodeType) => void;
}) {
    return (
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5">
            {NODE_TYPES.map((type) => {
                const on = active.has(type);
                return (
                    <button
                        key={type}
                        type="button"
                        onClick={() => onToggle(type)}
                        className={cn(
                            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                            on
                                ? "border-border bg-background/70 text-foreground backdrop-blur"
                                : "border-transparent bg-background/30 text-muted-foreground opacity-60",
                        )}
                    >
                        <span
                            className="size-2.5 rounded-full"
                            style={{
                                backgroundColor: NODE_TYPE_COLORS[type],
                                opacity: on ? 1 : 0.4,
                            }}
                        />
                        {NODE_TYPE_LABELS[type]}
                    </button>
                );
            })}
        </div>
    );
}
