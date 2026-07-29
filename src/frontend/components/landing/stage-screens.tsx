"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import {
    DECISION_ROUTE_NODE_IDS,
    LANDING_GRAPH_NODES,
    LANDING_SOURCES,
    type SourceVisual,
} from "./stage-screen-data";
import { StageScreenGraph } from "./stage-screen-graph";
import { StageSourceMark } from "./stage-source-mark";

const layer = (name: string) => `[data-constellation-layer="${name}"]`;
const target = (name: string) => `[data-${name}]`;

type StageIndex = 0 | 1 | 2 | 3;

type LayerState = {
    autoAlpha: number;
    scale: number;
};

type PhaseState = {
    sources: LayerState;
    graph: LayerState;
    decision: LayerState;
    integration: LayerState;
    routeAlpha: number;
    graphAlpha: number;
};

const PHASE_STATES: Record<StageIndex, PhaseState> = {
    0: {
        sources: { autoAlpha: 1, scale: 1 },
        graph: { autoAlpha: 0, scale: 0.62 },
        decision: { autoAlpha: 0, scale: 0.72 },
        integration: { autoAlpha: 0, scale: 0.8 },
        routeAlpha: 0,
        graphAlpha: 0,
    },
    1: {
        sources: { autoAlpha: 0, scale: 0.28 },
        graph: { autoAlpha: 1, scale: 1 },
        decision: { autoAlpha: 0, scale: 0.72 },
        integration: { autoAlpha: 0, scale: 0.8 },
        routeAlpha: 0,
        graphAlpha: 0.68,
    },
    2: {
        sources: { autoAlpha: 0, scale: 0.2 },
        graph: { autoAlpha: 1, scale: 1.02 },
        decision: { autoAlpha: 1, scale: 1 },
        integration: { autoAlpha: 0, scale: 0.8 },
        routeAlpha: 1,
        graphAlpha: 0.24,
    },
    3: {
        sources: { autoAlpha: 0, scale: 0.2 },
        graph: { autoAlpha: 1, scale: 1 },
        decision: { autoAlpha: 0.55, scale: 0.96 },
        integration: { autoAlpha: 1, scale: 1 },
        routeAlpha: 0.55,
        graphAlpha: 0.58,
    },
};

function buildPhaseTransition(stage: StageIndex): gsap.core.Timeline {
    const state = PHASE_STATES[stage];

    return gsap
        .timeline({
            defaults: {
                duration: 0.62,
                ease: "power2.inOut",
                overwrite: "auto",
            },
        })
        .to(layer("sources"), state.sources, 0)
        .to(layer("graph"), state.graph, 0)
        .to(layer("decision"), state.decision, 0)
        .to(layer("integration"), state.integration, 0)
        .to('[data-decision-route="true"]', { autoAlpha: state.routeAlpha }, 0)
        .to(
            '[data-graph-edge]:not([data-decision-route="true"]):not([data-phase-four-edge="true"])',
            { autoAlpha: state.graphAlpha },
            0,
        )
        .to('[data-phase-four-node="true"]', { autoAlpha: 0, scale: 0.35 }, 0)
        .to('[data-phase-four-edge="true"]', { autoAlpha: 0 }, 0);
}

function buildAmbientTimeline(stage: StageIndex): gsap.core.Timeline {
    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });

    if (stage === 0) {
        const packets = gsap.utils.toArray<SVGCircleElement>(
            "[data-context-packet]",
        );
        packets.forEach((packet, index) => {
            const x = Number(packet.dataset.packetX);
            const y = Number(packet.dataset.packetY);
            const at = index * 0.08;

            timeline
                .set(packet, { x: 0, y: 0, autoAlpha: 0 }, at)
                .to(packet, { autoAlpha: 1, duration: 0.12 }, at)
                .to(packet, { x, y, duration: 1.05, ease: "power1.in" }, at)
                .to(packet, { autoAlpha: 0, duration: 0.12 }, at + 0.93);
        });

        return timeline
            .to(
                "[data-source-mark]",
                {
                    y: (index) => (index % 2 === 0 ? -8 : 6),
                    rotation: (index) => (index % 2 === 0 ? 2 : -2),
                    duration: 1.8,
                    stagger: 0.06,
                    ease: "sine.inOut",
                },
                0,
            )
            .to("[data-source-mark]", {
                y: 0,
                rotation: 0,
                duration: 1.8,
                stagger: 0.04,
                ease: "sine.inOut",
            })
            .to({}, { duration: 0.8 });
    }

    if (stage === 1) {
        return timeline
            .to("[data-graph-camera]", {
                rotation: 3,
                scale: 1.02,
                transformOrigin: "center center",
                duration: 3.2,
                ease: "sine.inOut",
            })
            .to("[data-graph-camera]", {
                rotation: -2,
                scale: 0.99,
                duration: 3.2,
                ease: "sine.inOut",
            })
            .to(
                "[data-graph-cluster]",
                {
                    rotation: (index) => (index % 2 === 0 ? 1.8 : -1.5),
                    duration: 2.8,
                    stagger: 0.12,
                    yoyo: true,
                    repeat: 1,
                    ease: "sine.inOut",
                },
                0,
            );
    }

    if (stage === 2) {
        const routeNodes = DECISION_ROUTE_NODE_IDS.map((id) => {
            const node = LANDING_GRAPH_NODES.find(
                (candidate) => candidate.id === id,
            );
            if (!node) throw new Error(`Missing route node ${id}`);
            return node;
        });
        const origin = routeNodes[0];
        const particle = target("decision-particle");

        if (!origin) {
            return timeline;
        }

        timeline.set(particle, { x: 0, y: 0, autoAlpha: 0 });
        timeline.to(particle, { autoAlpha: 1, duration: 0.18 });

        for (const node of routeNodes.slice(1)) {
            timeline.to(particle, {
                x: node.x - origin.x,
                y: node.y - origin.y,
                duration: 0.42,
                ease: "power1.inOut",
            });
        }

        return timeline
            .to(target("decision-focus"), { scale: 1.04, duration: 0.24 })
            .to(target("decision-focus"), { scale: 1, duration: 0.28 })
            .to(particle, { autoAlpha: 0, duration: 0.18 })
            .to({}, { duration: 1.1 });
    }

    return timeline
        .set(target("integration-signal"), {
            x: 40,
            y: 26,
            scale: 0.8,
            autoAlpha: 0,
        })
        .set('[data-phase-four-node="true"]', { scale: 0.35, autoAlpha: 0 })
        .set('[data-phase-four-edge="true"]', { autoAlpha: 0 })
        .to(target("integration-signal"), {
            x: 0,
            y: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 0.32,
        })
        .to(target("integration-signal"), {
            x: -128,
            y: -76,
            scale: 0.3,
            autoAlpha: 0,
            duration: 0.72,
            ease: "power2.in",
        })
        .to(
            '[data-phase-four-node="true"]',
            { scale: 1, autoAlpha: 1, duration: 0.3 },
            ">-0.12",
        )
        .to(
            '[data-phase-four-edge="true"]',
            { autoAlpha: 1, duration: 0.32, stagger: 0.08 },
            ">-0.1",
        )
        .fromTo(
            target("integration-wave"),
            { scale: 0.4, autoAlpha: 0.8 },
            { scale: 1.45, autoAlpha: 0, duration: 0.75 },
        )
        .to(
            "[data-graph-camera]",
            { scale: 1.025, duration: 0.24, yoyo: true, repeat: 1 },
            "<",
        )
        .to({}, { duration: 1.2 })
        .to('[data-phase-four-node="true"], [data-phase-four-edge="true"]', {
            autoAlpha: 0,
            duration: 0.15,
        });
}

type StageScreenProps = {
    activeStage: StageIndex;
    active: boolean;
};

function contextPath(source: SourceVisual): string {
    const bend = source.depth * 2.5;
    const controlX = (source.x + 50) / 2 + (source.y < 50 ? bend : -bend);
    const controlY = (source.y + 50) / 2 + (source.x < 50 ? -bend : bend);
    return `M ${source.x} ${source.y} Q ${controlX} ${controlY} 50 50`;
}

export function StageScreen(props: StageScreenProps): ReactElement {
    const { active, activeStage } = props;
    const root = useRef<HTMLElement>(null);
    const transition = useRef<gsap.core.Timeline | null>(null);
    const ambient = useRef<gsap.core.Timeline | null>(null);

    useGSAP(
        () => {
            transition.current?.kill();
            ambient.current?.kill();
            transition.current = null;
            ambient.current = null;

            const desktop = window.matchMedia("(min-width: 64rem)").matches;
            const reduceMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)",
            ).matches;

            if (!desktop || reduceMotion) {
                gsap.set(layer("sources"), { autoAlpha: 0.5, scale: 0.72 });
                gsap.set(layer("graph"), { autoAlpha: 1, scale: 1 });
                gsap.set(layer("decision"), { autoAlpha: 1, scale: 1 });
                gsap.set(layer("integration"), { autoAlpha: 1, scale: 1 });
                gsap.set(
                    '[data-phase-four-node="true"], [data-phase-four-edge="true"]',
                    {
                        autoAlpha: 1,
                        scale: 1,
                    },
                );
                return;
            }

            if (!active) {
                return;
            }

            transition.current = buildPhaseTransition(activeStage);
            transition.current.eventCallback("onComplete", () => {
                ambient.current = buildAmbientTimeline(activeStage);
            });
        },
        {
            scope: root,
            dependencies: [activeStage, active],
            revertOnUpdate: false,
        },
    );

    useEffect(() => {
        const syncVisibility = () => {
            const paused = document.hidden || !active;
            transition.current?.paused(paused);
            ambient.current?.paused(paused);
        };

        syncVisibility();
        document.addEventListener("visibilitychange", syncVisibility);

        return () =>
            document.removeEventListener("visibilitychange", syncVisibility);
    }, [active]);

    useEffect(
        () => () => {
            transition.current?.kill();
            ambient.current?.kill();
            transition.current = null;
            ambient.current = null;
        },
        [],
    );

    return (
        <figure
            ref={root}
            data-constellation-narrative
            data-stage-active={props.active}
            data-active-stage={activeStage}
            className="relative min-h-[24rem] overflow-visible lg:absolute lg:inset-y-0 lg:right-0 lg:w-[62%]"
        >
            <figcaption className="sr-only">
                Fuentes aportan contexto, forman un grafo, iluminan una decisión
                y reciben una señal nueva como nodo conectado.
            </figcaption>
            <div
                data-constellation-layer="sources"
                className="absolute inset-0"
            >
                <svg
                    aria-hidden
                    viewBox="0 0 100 100"
                    className="absolute inset-0 size-full overflow-visible"
                >
                    <title>Rutas contextuales hacia Continuum</title>
                    {LANDING_SOURCES.map((source) => (
                        <g key={source.id}>
                            <path
                                data-context-path={source.id}
                                d={contextPath(source)}
                                className="fill-none stroke-primary/35"
                                vectorEffect="non-scaling-stroke"
                            />
                            <circle
                                data-context-packet={source.id}
                                data-packet-x={50 - source.x}
                                data-packet-y={50 - source.y}
                                cx={source.x}
                                cy={source.y}
                                r="0.65"
                                className={
                                    source.cluster === "decision" ||
                                    source.cluster === "criterion"
                                        ? "fill-brand-chord"
                                        : "fill-primary"
                                }
                            />
                        </g>
                    ))}
                </svg>
                {LANDING_SOURCES.map((source) => (
                    <StageSourceMark key={source.id} source={source} />
                ))}
                <div
                    data-continuum-core
                    className="absolute left-1/2 top-1/2 grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary/50 bg-primary text-primary-foreground shadow-2xl"
                >
                    Continuum
                </div>
            </div>
            <div
                data-constellation-layer="graph"
                className="absolute inset-[8%]"
            >
                <StageScreenGraph />
            </div>
            <div
                data-constellation-layer="decision"
                className="pointer-events-none absolute inset-0"
            >
                <div
                    data-decision-focus
                    className="absolute left-[69%] top-[28%] grid size-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-brand-chord/60 text-center text-xs"
                >
                    <span>
                        Decisión
                        <br />
                        <small className="text-muted-foreground">
                            Contexto reunido
                        </small>
                    </span>
                </div>
            </div>
            <div
                data-constellation-layer="integration"
                className="pointer-events-none absolute inset-0"
            >
                <span
                    data-integration-signal
                    className="absolute right-0 bottom-[18%] rounded-full border border-primary/50 bg-card px-3 py-2 text-primary text-xs"
                >
                    Nuevo contexto
                </span>
                <span
                    data-integration-wave
                    className="absolute inset-[18%] rounded-full border border-primary/35"
                />
            </div>
        </figure>
    );
}
