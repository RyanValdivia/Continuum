"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { PropsWithChildren, ReactNode, RefObject } from "react";
import { useRef } from "react";
import { Label } from "./lumen";

gsap.registerPlugin(useGSAP);

type StageMotionKind = "sources" | "graph" | "agent" | "freshness";

type StageScreenProps = {
    index: number;
    active: boolean;
};

type StageFrameProps = PropsWithChildren<{
    active: boolean;
    caption: ReactNode;
    motion: StageMotionKind;
}>;

const item = (name: string) => `[data-stage-item="${name}"]`;

function buildStageTimeline(
    motion: StageMotionKind,
    active: boolean,
): gsap.core.Timeline {
    const timeline = gsap.timeline({
        paused: !active,
        repeat: -1,
        repeatDelay: 1,
        defaults: { ease: "power2.inOut" },
    });

    if (motion === "sources") {
        return timeline
            .set(item("source"), { autoAlpha: 0, y: 12 })
            .set(item("connector"), {
                scaleX: 0,
                transformOrigin: "left center",
            })
            .set(item("core"), { autoAlpha: 0, scale: 0.94 })
            .to(item("source"), {
                autoAlpha: 1,
                y: 0,
                duration: 0.34,
                stagger: 0.1,
            })
            .to(
                item("connector"),
                { scaleX: 1, duration: 0.3, stagger: 0.1 },
                "<0.08",
            )
            .to(
                item("core"),
                { autoAlpha: 1, scale: 1, duration: 0.32 },
                ">-0.06",
            )
            .to(item("core"), { scale: 1.035, duration: 0.16 })
            .to(item("core"), { scale: 1, duration: 0.2 })
            .to({}, { duration: 0.8 });
    }

    if (motion === "graph") {
        return timeline
            .set(item("node"), { autoAlpha: 0, scale: 0.9 })
            .set(item("edge"), { autoAlpha: 0 })
            .set(item("core"), { autoAlpha: 0, scale: 0.94 })
            .to(item("node"), {
                autoAlpha: 1,
                scale: 1,
                duration: 0.34,
                stagger: 0.1,
            })
            .to(item("edge"), { autoAlpha: 1, duration: 0.36 }, "<0.12")
            .to(
                item("core"),
                { autoAlpha: 1, scale: 1, duration: 0.32 },
                ">-0.08",
            )
            .to(item("core"), { scale: 1.035, duration: 0.16 })
            .to(item("core"), { scale: 1, duration: 0.2 })
            .to({}, { duration: 0.8 });
    }

    if (motion === "agent") {
        return timeline
            .set(item("question"), { autoAlpha: 0, y: 12 })
            .set(item("answer"), { autoAlpha: 0, y: 12 })
            .set(item("source"), { autoAlpha: 0, y: 8 })
            .to(item("question"), {
                autoAlpha: 1,
                y: 0,
                duration: 0.38,
            })
            .to(
                item("answer"),
                { autoAlpha: 1, y: 0, duration: 0.38 },
                ">-0.06",
            )
            .to(
                item("source"),
                { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.1 },
                ">-0.04",
            )
            .to({}, { duration: 0.8 });
    }

    return timeline
        .set(item("source"), { autoAlpha: 0, y: 10 })
        .set(item("status"), { autoAlpha: 0, scale: 0.92 })
        .set(item("core"), { autoAlpha: 0, y: 8 })
        .to(item("source"), {
            autoAlpha: 1,
            y: 0,
            duration: 0.32,
            stagger: 0.1,
        })
        .to(
            item("status"),
            { autoAlpha: 1, scale: 1, duration: 0.26, stagger: 0.1 },
            "<0.12",
        )
        .to(item("core"), { autoAlpha: 1, y: 0, duration: 0.34 }, ">-0.02")
        .to({}, { duration: 0.8 });
}

function useStageCardMotion(
    scope: RefObject<HTMLElement | null>,
    motion: StageMotionKind,
    active: boolean,
) {
    useGSAP(
        () => {
            const media = gsap.matchMedia();

            media.add(
                {
                    desktop: "(min-width: 64rem)",
                    reduceMotion: "(prefers-reduced-motion: reduce)",
                },
                (context) => {
                    const { desktop, reduceMotion } = context.conditions ?? {};

                    if (!desktop || reduceMotion) return;

                    buildStageTimeline(motion, active);
                },
            );

            return () => media.revert();
        },
        {
            scope,
            dependencies: [active, motion],
            revertOnUpdate: true,
        },
    );
}

export function StageScreen({ index, active }: StageScreenProps) {
    switch (index) {
        case 0:
            return <SourcesScreen active={active} />;
        case 1:
            return <GraphScreen active={active} />;
        case 2:
            return <AgentScreen active={active} />;
        default:
            return <FreshnessScreen active={active} />;
    }
}

function StageFrame({ active, caption, children, motion }: StageFrameProps) {
    const scope = useRef<HTMLElement>(null);
    useStageCardMotion(scope, motion, active);

    return (
        <figure
            ref={scope}
            data-stage-active={active}
            data-stage-motion={motion}
            className="relative min-h-[20rem] overflow-hidden rounded-[var(--radius-card)] border border-border bg-card/90 p-[var(--space-lg)] lg:min-h-[28rem]"
        >
            <figcaption className="sr-only">{caption}</figcaption>
            <div className="relative z-10">{children}</div>
        </figure>
    );
}

function SourcesScreen({ active }: { active: boolean }) {
    const sources = ["Notion", "Slack", "Microsoft 365", "Documentos"];

    return (
        <StageFrame
            active={active}
            caption="Cuatro fuentes convergen en Continuum."
            motion="sources"
        >
            <Label className="text-primary">Conectar · fuentes</Label>
            <div className="mt-[var(--space-lg)] grid gap-[var(--space-md)] lg:grid-cols-[minmax(0,1fr)_9rem] lg:items-center">
                <ul className="grid gap-3" aria-label="Fuentes conectadas">
                    {sources.map((source) => (
                        <li
                            key={source}
                            data-stage-item="source"
                            className="flex items-center gap-3 text-foreground will-change-transform"
                        >
                            <span className="grid min-h-10 min-w-32 place-items-center rounded-[var(--radius-card)] border border-border bg-secondary px-3 text-sm">
                                {source}
                            </span>
                            <span
                                aria-hidden
                                data-stage-item="connector"
                                className="h-px flex-1 bg-primary will-change-transform"
                            />
                        </li>
                    ))}
                </ul>
                <div
                    data-stage-item="core"
                    className="grid size-36 justify-self-center place-items-center rounded-full border border-border bg-primary p-6 text-center text-primary-foreground will-change-transform"
                >
                    <Label className="text-primary-foreground">Continuum</Label>
                </div>
            </div>
        </StageFrame>
    );
}

function GraphScreen({ active }: { active: boolean }) {
    const nodes = ["Persona", "Decisión", "Documento", "Criterio"];

    return (
        <StageFrame
            active={active}
            caption="Un grafo relaciona persona, decisión, documento y criterio."
            motion="graph"
        >
            <Label className="text-brand-chord">Mapear · relaciones</Label>
            <div className="relative mt-[var(--space-lg)] grid min-h-64 place-items-center">
                <svg
                    aria-hidden
                    data-stage-item="edge"
                    className="absolute inset-0 size-full text-muted-foreground"
                    viewBox="0 0 400 260"
                >
                    <title>Relaciones entre nodos del grafo</title>
                    <line
                        x1="72"
                        y1="52"
                        x2="200"
                        y2="130"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                    <line
                        x1="328"
                        y1="52"
                        x2="200"
                        y2="130"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                    <line
                        x1="72"
                        y1="208"
                        x2="200"
                        y2="130"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                    <line
                        x1="328"
                        y1="208"
                        x2="200"
                        y2="130"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                </svg>
                <div className="relative grid w-full grid-cols-2 gap-x-8 gap-y-20 text-center text-sm">
                    {nodes.map((node) => (
                        <span
                            key={node}
                            data-stage-item="node"
                            className="justify-self-center rounded-full border border-border bg-secondary px-3 py-2 text-foreground will-change-transform"
                        >
                            {node}
                        </span>
                    ))}
                </div>
                <span
                    data-stage-item="core"
                    className="absolute rounded-full border border-border bg-primary px-4 py-3 text-primary-foreground text-sm will-change-transform"
                >
                    Grafo
                </span>
            </div>
        </StageFrame>
    );
}

function AgentScreen({ active }: { active: boolean }) {
    return (
        <StageFrame
            active={active}
            caption="Un agente de Head of Sales responde con sus fuentes."
            motion="agent"
        >
            <Label className="text-primary">Consultar · agente</Label>
            <div className="mt-[var(--space-lg)] grid gap-[var(--space-lg)]">
                <div
                    data-stage-item="question"
                    className="rounded-[var(--radius-card)] border border-border bg-secondary p-[var(--space-md)] will-change-transform"
                >
                    <Label className="text-muted-foreground">
                        Head of Sales
                    </Label>
                    <p className="mt-2 text-foreground leading-relaxed">
                        «¿Puedo cerrar este deal con 20 % de descuento?»
                    </p>
                </div>
                <div
                    data-stage-item="answer"
                    className="rounded-[var(--radius-card)] border border-border bg-card p-[var(--space-md)] will-change-transform"
                >
                    <Label className="text-primary">Respuesta</Label>
                    <p className="mt-2 text-foreground leading-relaxed">
                        No sin aprobación — el tope sin escalar es 15 %.
                    </p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Fuentes</Label>
                    <ul className="mt-2 grid gap-2 text-muted-foreground text-sm">
                        <li
                            data-stage-item="source"
                            className="rounded-[var(--radius-card)] border border-border bg-secondary px-3 py-2 will-change-transform"
                        >
                            Política comercial · Notion
                        </li>
                        <li
                            data-stage-item="source"
                            className="rounded-[var(--radius-card)] border border-border bg-secondary px-3 py-2 will-change-transform"
                        >
                            Aprobaciones de descuento · Slack
                        </li>
                    </ul>
                </div>
            </div>
        </StageFrame>
    );
}

function FreshnessScreen({ active }: { active: boolean }) {
    const sources = ["Slack", "Notion", "Microsoft 365"];

    return (
        <StageFrame
            active={active}
            caption="Las fuentes sincronizadas mantienen el grafo al día."
            motion="freshness"
        >
            <Label className="text-brand-chord">Mantener · sync continuo</Label>
            <ul
                className="mt-[var(--space-lg)] grid gap-3"
                aria-label="Estado de sincronización"
            >
                {sources.map((source) => (
                    <li
                        key={source}
                        data-stage-item="source"
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-secondary px-4 py-3 will-change-transform"
                    >
                        <span className="text-foreground">{source}</span>
                        <span
                            data-stage-item="status"
                            className="will-change-transform"
                        >
                            <Label className="text-primary">Actualizado</Label>
                        </span>
                    </li>
                ))}
            </ul>
            <div
                data-stage-item="core"
                className="mt-[var(--space-lg)] flex items-center justify-between rounded-[var(--radius-card)] border border-border bg-primary p-[var(--space-md)] text-primary-foreground will-change-transform"
            >
                <span>Grafo al día</span>
                <span aria-hidden className="size-3 rounded-full bg-card" />
            </div>
        </StageFrame>
    );
}
