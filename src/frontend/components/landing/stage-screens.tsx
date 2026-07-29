"use client";

import { useGSAP } from "@gsap/react";
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { LANDING_SOURCES, type SourceVisual } from "./stage-screen-data";
import { StageScreenGraph } from "./stage-screen-graph";
import {
    applySettledPhase,
    buildAmbientLoop,
    buildPhaseTransition,
    type StageIndex,
} from "./stage-screen-motion";
import { StageSourceMark } from "./stage-source-mark";

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

            // Without the choreography there is only ever one frame to show, so
            // it has to be the end of the story: the last scene, played out.
            if (!desktop || reduceMotion) {
                applySettledPhase(3);
                return;
            }

            if (!active) {
                applySettledPhase(activeStage);
                return;
            }

            // The scene changes with the scroll; inside it the apparatus runs
            // on its own clock. The loop only starts once the incoming state
            // has settled, so the two never animate the same property at once.
            const loop = buildAmbientLoop(activeStage).pause();
            const entrance = buildPhaseTransition(activeStage);

            entrance.eventCallback("onComplete", () => {
                loop.play().paused(document.hidden);
            });

            transition.current = entrance;
            ambient.current = loop;
        },
        {
            scope: root,
            dependencies: [activeStage, active],
            revertOnUpdate: false,
        },
    );

    useEffect(() => {
        const syncVisibility = () => {
            transition.current?.paused(document.hidden);
            // Only ever resumes a loop the transition already started.
            if (ambient.current?.progress()) {
                ambient.current.paused(document.hidden);
            }
        };

        document.addEventListener("visibilitychange", syncVisibility);
        return () =>
            document.removeEventListener("visibilitychange", syncVisibility);
    }, []);

    useEffect(() => {
        return () => {
            transition.current?.kill();
            ambient.current?.kill();
            transition.current = null;
            ambient.current = null;
        };
    }, []);

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
            <div aria-hidden="true" className="contents">
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
                                    // Dashes make the path a direction rather
                                    // than a line; the loop crawls the offset
                                    // along it. See FLOW_DASH_PERIOD.
                                    strokeDasharray="3 5"
                                    className="fill-none stroke-primary/55"
                                    vectorEffect="non-scaling-stroke"
                                />
                                <circle
                                    data-context-packet={source.id}
                                    data-packet-x={50 - source.x}
                                    data-packet-y={50 - source.y}
                                    cx={source.x}
                                    cy={source.y}
                                    r="1.2"
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
                    className="pointer-events-none absolute inset-[8%]"
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 100 100"
                        className="size-full overflow-visible"
                    >
                        {/* Sits on the graph's centre, where the four clusters
                            merge. Sharing the graph's viewBox is what keeps it
                            there across viewports. */}
                        <g
                            data-decision-core
                            style={{ transformOrigin: "50px 50px" }}
                        >
                            <circle
                                data-decision-core-halo
                                cx="50"
                                cy="50"
                                r="14"
                                className="fill-none stroke-brand-chord/35"
                                vectorEffect="non-scaling-stroke"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="9"
                                className="fill-brand-chord/15 stroke-brand-chord"
                                vectorEffect="non-scaling-stroke"
                            />
                            <text
                                x="50"
                                y="51.2"
                                textAnchor="middle"
                                className="fill-foreground font-mono text-[3px]"
                            >
                                Decisión
                            </text>
                        </g>
                        <g data-decision-core-caption>
                            <text
                                x="50"
                                y="68.5"
                                textAnchor="middle"
                                className="fill-brand-chord font-mono text-[2.4px]"
                            >
                                Lista para founders
                            </text>
                            <text
                                x="50"
                                y="72.5"
                                textAnchor="middle"
                                className="fill-muted-foreground font-mono text-[2px]"
                            >
                                Todo el contexto en un punto
                            </text>
                        </g>
                    </svg>
                </div>
                <div
                    data-constellation-layer="integration"
                    className="pointer-events-none absolute inset-[8%]"
                >
                    {/* Shares the graph's viewBox so an arriving signal can be
                        flown to the exact node it becomes. */}
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 100 100"
                        className="size-full overflow-visible"
                    >
                        <g data-integration-signal>
                            <rect
                                x="-11"
                                y="-2.6"
                                width="22"
                                height="5.2"
                                rx="2.6"
                                className="fill-card stroke-primary/50"
                                vectorEffect="non-scaling-stroke"
                            />
                            <text
                                y="0.9"
                                textAnchor="middle"
                                className="fill-primary font-mono text-[2.2px]"
                            >
                                Nuevo contexto
                            </text>
                        </g>
                        <circle
                            data-integration-wave
                            r="9"
                            className="fill-none stroke-primary/35"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                </div>
            </div>
        </figure>
    );
}
