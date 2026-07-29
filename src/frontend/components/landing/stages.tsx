"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { BrandShader } from "./brand-shader";
import { Label, SectionHead } from "./lumen";
import { GsapPinnedScenes } from "./motion";
import { StageScreen } from "./stage-screens";

type Stage = {
    n: string;
    kicker: string;
    when: string;
    title: string;
    body: ReactNode;
    chips: string[];
    accessibilitySummary: string;
    tone: "primary" | "chord";
};

const STAGES: Stage[] = [
    {
        n: "1",
        kicker: "Conectar",
        when: "Día uno",
        title: "Conecta lo que tu equipo ya sabe",
        body: (
            <>
                Notion, Slack, Microsoft 365 y documentos aportan decisiones,
                conversaciones, personas y criterios a Continuum.
                <strong className="font-medium text-foreground">
                    Sin migración
                </strong>{" "}
                y contexto desde el origen.
            </>
        ),
        chips: ["Sin migración", "Contexto desde el origen"],
        accessibilitySummary:
            "Notion, Slack, Microsoft 365 y documentos aportan decisiones, conversaciones, personas y criterios a Continuum.",
        tone: "primary",
    },
    {
        n: "2",
        kicker: "Mapear",
        when: "En segundo plano",
        title: "El contexto encuentra sus relaciones",
        body: (
            <>
                Continuum organiza ese contexto en un grafo de personas,
                decisiones, documentos y criterios relacionados.
                <strong className="font-medium text-foreground">
                    Grafo automático
                </strong>{" "}
                y relaciones vivas.
            </>
        ),
        chips: ["Grafo automático", "Relaciones vivas"],
        accessibilitySummary:
            "Continuum organiza ese contexto en un grafo de personas, decisiones, documentos y criterios relacionados.",
        tone: "chord",
    },
    {
        n: "3",
        kicker: "Decidir",
        when: "Antes de actuar",
        title: "Cada decisión llega con su contexto",
        body: (
            <>
                Una decisión conecta su contexto relevante: precedentes,
                personas, documentos y criterios.
                <strong className="font-medium text-foreground">
                    Contexto compartido
                </strong>{" "}
                y criterios conectados.
            </>
        ),
        chips: ["Contexto compartido", "Criterios conectados"],
        accessibilitySummary:
            "Una decisión conecta su contexto relevante: precedentes, personas, documentos y criterios.",
        tone: "primary",
    },
    {
        n: "4",
        kicker: "Mantener",
        when: "Continuo",
        title: "Cada señal hace evolucionar el grafo",
        body: (
            <>
                Una señal nueva se integra como nodo, crea relaciones y modifica
                el grafo.
                <strong className="font-medium text-foreground">
                    Topología viva
                </strong>{" "}
                con sync continuo.
            </>
        ),
        chips: ["Sync continuo", "Topología viva"],
        accessibilitySummary:
            "Una señal nueva se integra como nodo, crea relaciones y modifica el grafo.",
        tone: "chord",
    },
];

export function LandingStages() {
    const [activeScene, setActiveScene] = useState<0 | 1 | 2 | 3>(0);
    const [sectionActive, setSectionActive] = useState(false);

    return (
        <section id="etapas" className="scroll-mt-24 border-border border-b">
            <div className="shell py-[var(--space-2xl)] lg:pt-[var(--space-3xl)] lg:pb-0">
                <SectionHead
                    kicker="Cómo funciona"
                    title="Cuatro etapas, de la fuente a la ruta."
                    lede="Las mismas cuatro, siempre en el mismo orden. Continuum sostiene la estructura para que tú no tengas que recordarla."
                />
            </div>
            <GsapPinnedScenes
                onSceneChange={setActiveScene}
                onSectionActiveChange={setSectionActive}
                className="relative overflow-clip lg:min-h-svh"
            >
                <BrandShader
                    activeStage={activeScene}
                    desktopMotionOnly
                    variant="constellation"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-background/45"
                />
                <div aria-hidden className="shell relative">
                    <StageScreen
                        activeStage={activeScene}
                        active={sectionActive}
                    />
                    <ol className="grid gap-[var(--space-lg)] py-[var(--space-2xl)] lg:min-h-svh lg:py-0">
                        {STAGES.map((stage) => (
                            <li
                                key={stage.n}
                                data-full-scene
                                className="full-scene-panel grid min-w-0 content-center gap-[var(--space-xl)] py-[var(--space-xl)] lg:absolute lg:inset-0 lg:w-[42%] lg:py-[var(--space-2xl)]"
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
                                    <h3 className="mt-3 max-w-[16ch] font-display text-[length:var(--text-display-s)] leading-[1.05] tracking-[-0.025em]">
                                        {stage.title}
                                    </h3>
                                    <p className="mt-[var(--space-lg)] max-w-[52ch] text-muted-foreground leading-relaxed">
                                        {stage.body}
                                    </p>
                                    <ul className="mt-[var(--space-lg)] flex flex-wrap gap-x-[var(--space-lg)] gap-y-[var(--space-sm)]">
                                        {stage.chips.map((chip) => (
                                            <li
                                                key={chip}
                                                className="border-border border-l pl-3"
                                            >
                                                <Label className="text-muted-foreground">
                                                    {chip}
                                                </Label>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <div className="full-scene-progress absolute right-[62%] bottom-[var(--space-xl)] left-[var(--page-gutter)] hidden">
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
                <ol className="sr-only" aria-label="Todas las etapas">
                    {STAGES.map((stage) => (
                        <li key={stage.n}>
                            <p>
                                {stage.n}.0 · {stage.kicker} · {stage.when}
                            </p>
                            <h3>{stage.title}</h3>
                            <p>{stage.body}</p>
                            <p>{stage.accessibilitySummary}</p>
                            <ul>
                                {stage.chips.map((chip) => (
                                    <li key={chip}>{chip}</li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ol>
            </GsapPinnedScenes>
        </section>
    );
}
