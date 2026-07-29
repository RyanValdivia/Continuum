"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { LANDING_SOURCES, type SourceVisual } from "./stage-screen-data";
import { StageScreenGraph } from "./stage-screen-graph";
import {
    applyPhaseFourSnapshot,
    applyPhaseSnapshot,
    applyTransientHiddenSnapshot,
    buildAmbientTimeline,
    buildPhaseTransition,
    layer,
    PHASE_FOUR_COMPLETED,
    type StageIndex,
    shouldPauseAmbient,
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
    const transitionComplete = useRef(false);
    const ambientReady = useRef(false);

    useGSAP(
        () => {
            transition.current?.kill();
            ambient.current?.kill();
            transition.current = null;
            ambient.current = null;
            transitionComplete.current = false;
            ambientReady.current = false;

            const desktop = window.matchMedia("(min-width: 64rem)").matches;
            const reduceMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)",
            ).matches;

            if (!desktop || reduceMotion) {
                gsap.set(layer("sources"), { autoAlpha: 0.5, scale: 0.72 });
                gsap.set(layer("graph"), { autoAlpha: 1, scale: 1 });
                gsap.set(layer("decision"), { autoAlpha: 1, scale: 1 });
                gsap.set(layer("integration"), { autoAlpha: 1, scale: 1 });
                applyPhaseFourSnapshot(PHASE_FOUR_COMPLETED);
                applyTransientHiddenSnapshot();
                return;
            }

            if (!active) {
                applyPhaseSnapshot(activeStage);
                return;
            }

            transition.current = buildPhaseTransition(activeStage);
            ambient.current = buildAmbientTimeline(activeStage);
            ambient.current?.pause();

            transition.current.eventCallback("onComplete", () => {
                transitionComplete.current = true;
                ambientReady.current = true;

                const isPaused = shouldPauseAmbient({
                    isHidden: document.hidden,
                    active,
                    transitionComplete: transitionComplete.current,
                    ambientReady: ambientReady.current,
                });

                if (isPaused) {
                    return;
                }

                ambient.current?.play();
            });
        },
        {
            scope: root,
            dependencies: [activeStage, active],
            revertOnUpdate: false,
        },
    );

    // biome-ignore lint/correctness/useExhaustiveDependencies: activeStage ensures pause state re-syncs after stage rebuilds.
    useEffect(() => {
        const syncVisibility = () => {
            const isAmbientPaused = shouldPauseAmbient({
                isHidden: document.hidden,
                active,
                transitionComplete: transitionComplete.current,
                ambientReady: ambientReady.current,
            });

            transition.current?.paused(document.hidden);
            ambient.current?.paused(isAmbientPaused);
        };

        syncVisibility();
        document.addEventListener("visibilitychange", syncVisibility);

        return () =>
            document.removeEventListener("visibilitychange", syncVisibility);
    }, [active, activeStage]);

    useEffect(() => {
        return () => {
            transition.current?.kill();
            ambient.current?.kill();
            transition.current = null;
            ambient.current = null;
            transitionComplete.current = false;
            ambientReady.current = false;
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
            </div>
        </figure>
    );
}
