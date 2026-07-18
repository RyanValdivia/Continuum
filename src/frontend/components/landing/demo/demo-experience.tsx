"use client";

import { useState } from "react";
import { PUESTOS, type PuestoId } from "./graph-data";
import { KnowledgeGraph } from "./knowledge-graph";
import { RoadmapPanel } from "./roadmap-panel";
import { ShaderBackdrop } from "./shader-backdrop";

export function DemoExperience() {
    const [hovered, setHovered] = useState<PuestoId | null>(null);
    const [selected, setSelected] = useState<PuestoId | null>(null);
    const active = hovered ?? selected;

    const toggleSelect = (id: PuestoId | null) => {
        setSelected((prev) => (id && prev === id ? null : id));
    };

    return (
        <div>
            <div className="relative h-[460px] overflow-hidden rounded-2xl border border-border/70 bg-card">
                <ShaderBackdrop />
                <div className="absolute inset-0 z-10 flex flex-col">
                    <div className="relative flex-1">
                        <KnowledgeGraph
                            active={active}
                            onHover={setHovered}
                            onSelect={toggleSelect}
                        />
                    </div>
                    <div className="shrink-0 border-border/60 border-t bg-card/70 px-4 py-2.5 text-center text-muted-foreground text-sm backdrop-blur-sm">
                        {active ? (
                            <span className="text-foreground">
                                Conocimiento del agente de{" "}
                                <span className="font-medium">
                                    {PUESTOS[active].label}
                                </span>{" "}
                                — haz clic para ver su roadmap.
                            </span>
                        ) : (
                            "Pasa el cursor sobre un puesto para ver su conocimiento. Haz clic para el roadmap."
                        )}
                    </div>
                </div>
            </div>

            <RoadmapPanel selected={selected} />
        </div>
    );
}
