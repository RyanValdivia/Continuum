"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { BrandShader } from "./brand-shader";
import { Label } from "./lumen";
import { GsapPinnedScenes } from "./motion";
import { StageScreen } from "./stage-screens";

type Stage = {
    n: string;
    kicker: string;
    when: string;
    title: string;
    body: ReactNode;
    chips: string[];
    tone: "primary" | "chord";
};

const STAGES: Stage[] = [
    {
        n: "1",
        kicker: "Conectar",
        when: "Día uno",
        title: "Enchufa las fuentes que ya usas",
        body: (
            <>
                Notion, Slack, Microsoft 365 y la revisión de documentos entran
                tal como están.{" "}
                <strong className="font-medium text-foreground">
                    Nadie migra nada
                </strong>{" "}
                ni cambia de herramienta: el equipo sigue trabajando donde
                trabaja.
            </>
        ),
        chips: ["4 fuentes", "Sin migración"],
        tone: "primary",
    },
    {
        n: "2",
        kicker: "Mapear",
        when: "En segundo plano",
        title: "El grafo se construye solo",
        body: (
            <>
                Cada página, hilo y documento se resuelve contra la persona y el
                proyecto que le corresponden.{" "}
                <strong className="font-medium text-foreground">
                    Lo que se guarda son las relaciones
                </strong>
                , no una copia más del archivo.
            </>
        ),
        chips: ["4 tipos de nodo", "Automático"],
        tone: "chord",
    },
    {
        n: "3",
        kicker: "Consultar",
        when: "Cuando haga falta",
        title: "Un agente por puesto",
        body: (
            <>
                Cada puesto tiene un agente que responde con el criterio de
                quien lo ocupa —{" "}
                <strong className="font-medium text-foreground">
                    no con el primer documento que encuentra
                </strong>
                .
            </>
        ),
        chips: ["Agente por puesto", "Con contexto"],
        tone: "primary",
    },
    {
        n: "4",
        kicker: "Mantener",
        when: "Continuo",
        title: "El grafo no envejece",
        body: (
            <>
                Cada sync trae lo nuevo y lo vuelve a atar a la persona y al
                proyecto correctos, así que{" "}
                <strong className="font-medium text-foreground">
                    lo que respondes hoy sigue siendo cierto mañana
                </strong>
                .
            </>
        ),
        chips: ["Sync continuo", "Sin mantenimiento manual"],
        tone: "chord",
    },
];

export function LandingStages() {
    const [activeScene, setActiveScene] = useState(0);

    return (
        <section id="etapas" className="scroll-mt-24 border-border border-b">
            <GsapPinnedScenes
                onSceneChange={setActiveScene}
                className="relative overflow-clip lg:min-h-svh"
            >
                <BrandShader
                    desktopMotionOnly
                    variant="field"
                    className="opacity-[0.2]"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-background/45"
                />
                <div className="shell relative">
                    <ol className="grid gap-[var(--space-lg)] py-[var(--space-2xl)] lg:min-h-svh lg:py-0">
                        {STAGES.map((stage, index) => (
                            <li
                                key={stage.n}
                                data-full-scene
                                className="full-scene-panel grid min-w-0 gap-[var(--space-xl)] lg:absolute lg:inset-0 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center"
                            >
                                <div className="min-w-0">
                                    <Label
                                        className={
                                            stage.tone === "primary"
                                                ? "text-primary"
                                                : "text-brand-chord"
                                        }
                                    >
                                        {stage.n}.0 · {stage.kicker} ·{" "}
                                        {stage.when}
                                    </Label>
                                    <h2 className="mt-3 max-w-[16ch] font-display text-[length:var(--text-display-s)] leading-[1.05] tracking-[-0.025em]">
                                        {stage.title}
                                    </h2>
                                    <p className="mt-[var(--space-lg)] max-w-[52ch] text-muted-foreground leading-relaxed">
                                        {stage.body}
                                    </p>
                                </div>
                                <StageScreen index={index} />
                            </li>
                        ))}
                    </ol>

                    <div className="absolute right-[var(--page-gutter)] bottom-[var(--space-xl)] left-[var(--page-gutter)] hidden lg:block">
                        <ol
                            aria-label="Progreso de las etapas"
                            className="grid grid-cols-4 gap-[var(--space-sm)]"
                        >
                            {STAGES.map((stage, index) => (
                                <li
                                    key={stage.n}
                                    aria-current={
                                        activeScene === index
                                            ? "step"
                                            : undefined
                                    }
                                    className={
                                        activeScene === index
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    }
                                >
                                    <span className="sr-only">
                                        Etapa {stage.n}: {stage.kicker}
                                    </span>
                                    <span
                                        aria-hidden
                                        className={
                                            activeScene === index
                                                ? "block h-2 rounded-full bg-primary"
                                                : "block h-2 rounded-full bg-border"
                                        }
                                    />
                                </li>
                            ))}
                        </ol>
                        <div
                            aria-hidden
                            className="relative mt-[var(--space-sm)] h-px overflow-hidden bg-border"
                        >
                            <span
                                data-scene-progress
                                className="absolute inset-y-0 left-0 w-full bg-primary"
                            />
                        </div>
                    </div>
                </div>
            </GsapPinnedScenes>
        </section>
    );
}
