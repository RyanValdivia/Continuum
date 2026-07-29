/** @vitest-environment happy-dom */

import { gsap } from "gsap";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildAmbientLoop, buildPhaseTransition } from "../stage-screen-motion";
import { StageScreen } from "../stage-screens";

// happy-dom exposes `transform` on SVG elements but not
// `transform.baseVal.consolidate()`, which GSAP calls to read an element's
// current matrix before writing a new one. Without it, building any timeline
// that transforms an SVG group throws. happy-dom publishes no `SVG*` globals,
// so the prototype has to be reached through an actual element.
function patchSvgTransform(): void {
    let node: object | null = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
    );

    while (node) {
        if (Object.getOwnPropertyDescriptor(node, "transform")) {
            const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

            Object.defineProperty(node, "transform", {
                configurable: true,
                get: () => ({
                    baseVal: {
                        numberOfItems: 0,
                        consolidate: () => ({ matrix: identity }),
                        clear: () => {},
                    },
                }),
            });
            return;
        }
        node = Object.getPrototypeOf(node);
    }
}

patchSvgTransform();

type MatchMediaConfig = {
    desktop: boolean;
    reduceMotion: boolean;
};

function count(markup: string, attribute: string): number {
    return markup.match(new RegExp(attribute, "g"))?.length ?? 0;
}

function mockMatchMedia(config: MatchMediaConfig): () => void {
    const previousMatchMedia = window.matchMedia;

    Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: (query: string): MediaQueryList => {
            const matches =
                query === "(min-width: 64rem)"
                    ? config.desktop
                    : query === "(prefers-reduced-motion: reduce)"
                      ? config.reduceMotion
                      : false;

            return {
                media: query,
                matches,
                onchange: null,
                addListener: () => {},
                removeListener: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false,
            } satisfies MediaQueryList;
        },
    });

    return () => {
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: previousMatchMedia,
        });
    };
}

async function mountStageScreen(
    props: { activeStage: 0 | 1 | 2 | 3; active: boolean },
    media: MatchMediaConfig,
): Promise<{ container: HTMLElement; unmount: () => Promise<void> }> {
    const restoreMatchMedia = mockMatchMedia(media);
    const container = document.createElement("div");
    const root = createRoot(container);

    document.body.appendChild(container);

    await act(async () => {
        root.render(createElement(StageScreen, props));
    });

    return {
        container,
        unmount: async () => {
            await act(async () => {
                root.unmount();
            });
            container.remove();
            restoreMatchMedia();
        },
    };
}

function layerStyle(container: HTMLElement, name: string): CSSStyleDeclaration {
    const layer = container.querySelector<HTMLElement>(
        `[data-constellation-layer="${name}"]`,
    );
    if (!layer) {
        throw new Error(`Missing constellation layer: ${name}`);
    }
    return layer.style;
}

describe("StageScreen", () => {
    const screen = renderToStaticMarkup(
        createElement(StageScreen, { activeStage: 0, active: true }),
    );

    it("renders one continuous constellation", () => {
        expect(screen).toContain("data-constellation-narrative");
        expect(screen).toContain('data-stage-active="true"');
        expect(screen).toMatch(/<figure[^>]*><figcaption/);
        expect(count(screen, "data-source-mark=")).toBe(14);
        expect(count(screen, "data-context-path=")).toBe(14);
        expect(count(screen, "data-context-packet=")).toBe(14);
        expect(screen).toContain("data-graph-camera");
    });

    it("exposes all four narrative layers", () => {
        for (const layer of ["sources", "graph", "decision", "integration"]) {
            expect(screen).toContain(`data-constellation-layer="${layer}"`);
        }
        expect(screen).toContain("data-decision-core");
        expect(screen).toContain("data-decision-core-caption");
        expect(screen).toContain("data-integration-signal");
    });

    it("frames the converged decision for founders", () => {
        expect(screen).toContain("Lista para founders");
        expect(screen).toContain("Todo el contexto en un punto");
    });

    it("removes the old chat and freshness cards", () => {
        for (const oldContent of [
            "Head of Sales",
            "¿Puedo cerrar este deal",
            "Respuesta",
            "Grafo al día",
            "Actualizado",
        ]) {
            expect(screen).not.toContain(oldContent);
        }
    });

    it("exposes complete GSAP choreography targets", () => {
        expect(count(screen, "data-graph-cluster=")).toBe(4);
        expect(count(screen, 'data-decision-route="true"')).toBe(4);
        expect(count(screen, 'data-phase-four-node="true"')).toBe(4);
        expect(count(screen, 'data-phase-four-edge="true"')).toBe(9);
        expect(screen).toContain("data-decision-particle");
        expect(screen).toContain("data-integration-wave");
        expect(screen).toContain("data-continuum-core");
    });

    it("gives the convergence beat the hub coordinates it merges from", () => {
        expect(count(screen, "data-hub-x=")).toBe(4);
        expect(count(screen, "data-hub-y=")).toBe(4);
    });

    it("applies inactive desktop baseline state on first mount", async () => {
        const { container, unmount } = await mountStageScreen(
            { activeStage: 0, active: false },
            { desktop: true, reduceMotion: false },
        );

        try {
            const sources = layerStyle(container, "sources");
            const graph = layerStyle(container, "graph");
            const decision = layerStyle(container, "decision");
            const integration = layerStyle(container, "integration");

            expect(sources.opacity).toBe("1");
            expect(graph.opacity).toBe("0");
            expect(decision.opacity).toBe("0");
            expect(integration.opacity).toBe("0");
        } finally {
            await unmount();
        }
    });

    it("renders reduced-motion fallback as completed static state", async () => {
        const { container, unmount } = await mountStageScreen(
            { activeStage: 2, active: true },
            { desktop: true, reduceMotion: true },
        );

        try {
            const sources = layerStyle(container, "sources");
            const graph = layerStyle(container, "graph");
            const decision = layerStyle(container, "decision");
            const integration = layerStyle(container, "integration");

            // Matches the last scene played out: one finished graph, not every
            // layer stacked at once.
            expect(sources.opacity).toBe("0");
            expect(graph.opacity).toBe("1");
            expect(decision.opacity).toBe("0");
            expect(integration.opacity).toBe("1");

            const phaseFourNode = container.querySelector<SVGGraphicsElement>(
                '[data-phase-four-node="true"]',
            );
            const phaseFourEdges = container.querySelectorAll<SVGLineElement>(
                '[data-phase-four-edge="true"]',
            );

            expect(phaseFourNode?.style.opacity).toBe("1");
            expect(phaseFourEdges).toHaveLength(9);
            for (const edge of phaseFourEdges) {
                expect(edge.style.opacity).toBe("1");
            }

            const integrationSignal = container.querySelector<HTMLElement>(
                "[data-integration-signal]",
            );
            const integrationWave = container.querySelector<HTMLElement>(
                "[data-integration-wave]",
            );

            expect(integrationSignal?.style.opacity).toBe("0");
            expect(integrationWave?.style.opacity).toBe("0");
        } finally {
            await unmount();
        }
    });

    it("shows the completed phase-four snapshot when stage three is inactive", async () => {
        const { container, unmount } = await mountStageScreen(
            { activeStage: 3, active: false },
            { desktop: true, reduceMotion: false },
        );

        try {
            const phaseFourNode = container.querySelector<SVGGraphicsElement>(
                '[data-phase-four-node="true"]',
            );
            const phaseFourEdges = container.querySelectorAll<SVGLineElement>(
                '[data-phase-four-edge="true"]',
            );

            expect(phaseFourNode?.style.opacity).toBe("1");
            expect(phaseFourEdges).toHaveLength(9);
            for (const edge of phaseFourEdges) {
                expect(edge.style.opacity).toBe("1");
            }

            const integrationSignal = container.querySelector<HTMLElement>(
                "[data-integration-signal]",
            );
            const integrationWave = container.querySelector<HTMLElement>(
                "[data-integration-wave]",
            );

            expect(integrationSignal?.style.opacity).toBe("0");
            expect(integrationWave?.style.opacity).toBe("0");
        } finally {
            await unmount();
        }
    });

    it("keeps the phase-four snapshot hidden for earlier stages when inactive", async () => {
        const { container, unmount } = await mountStageScreen(
            { activeStage: 1, active: false },
            { desktop: true, reduceMotion: false },
        );

        try {
            const phaseFourNode = container.querySelector<SVGGraphicsElement>(
                '[data-phase-four-node="true"]',
            );

            expect(phaseFourNode?.style.opacity).toBe("0");
        } finally {
            await unmount();
        }
    });

    it("holds the loop until the incoming scene has settled", async () => {
        const playSpy = vi.spyOn(gsap.core.Timeline.prototype, "play");

        const { unmount } = await mountStageScreen(
            { activeStage: 1, active: true },
            { desktop: true, reduceMotion: false },
        );

        try {
            // Otherwise the loop and the scene-change tween animate the same
            // properties against each other.
            expect(playSpy).toHaveBeenCalledTimes(0);
        } finally {
            playSpy.mockRestore();
            await unmount();
        }
    });
});

describe("ambient loops", () => {
    async function mountedAt(activeStage: 0 | 1 | 2 | 3) {
        return mountStageScreen(
            { activeStage, active: true },
            { desktop: true, reduceMotion: false },
        );
    }

    it("runs every scene forever, independent of the scroll", () => {
        for (const stage of [0, 1, 2, 3] as const) {
            const loop = buildAmbientLoop(stage);
            expect(loop.repeat()).toBe(-1);
            expect(loop.duration()).toBeGreaterThan(0);
            loop.kill();
        }
    });

    it("admits the four signals one at a time, in different places", async () => {
        const { container, unmount } = await mountedAt(3);
        const loop = buildAmbientLoop(3);

        try {
            const opacityAt = (time: number) => {
                loop.time(time);
                return [
                    ...container.querySelectorAll<SVGGElement>(
                        '[data-phase-four-node="true"]',
                    ),
                ]
                    .sort(
                        (a, b) =>
                            Number(a.dataset.signalOrder) -
                            Number(b.dataset.signalOrder),
                    )
                    .map((node) => Number(node.style.opacity));
            };

            expect(opacityAt(0)).toEqual([0, 0, 0, 0]);

            // Each signal lands in its own beat rather than all at once.
            const revealed = [1.3, 2.9, 4.5, 6.1].map(
                (time) => opacityAt(time).filter((value) => value > 0.9).length,
            );
            expect(revealed).toEqual([1, 2, 3, 4]);

            expect(opacityAt(loop.duration())).toEqual([1, 1, 1, 1]);
        } finally {
            loop.kill();
            await unmount();
        }
    });

    it("gathers the graph on the way into the decision, and never reopens it there", async () => {
        const { container, unmount } = await mountedAt(2);
        const cluster = container.querySelector<SVGGElement>(
            "[data-graph-cluster]",
        );
        const core = container.querySelector<SVGGElement>(
            "[data-decision-core]",
        );
        const scaleOf = () =>
            Number(
                /matrix\(([\d.]+)/.exec(
                    cluster?.getAttribute("transform") ?? "",
                )?.[1] ?? 1,
            );

        const entrance = buildPhaseTransition(2);
        const loop = buildAmbientLoop(2);

        try {
            entrance.progress(0);
            expect(scaleOf()).toBeCloseTo(1, 1);

            entrance.progress(1);
            expect(scaleOf()).toBeLessThan(0.3);
            expect(Number(core?.style.opacity)).toBeCloseTo(1, 1);

            // The loop feeds the core; it must not undo the convergence, or the
            // scene spends half its time showing the opposite of its point.
            for (const time of [0, 0.8, 1.6, 2.4, 3.2, loop.duration()]) {
                loop.time(time);
                expect(scaleOf()).toBeLessThan(0.3);
            }
        } finally {
            loop.kill();
            entrance.kill();
            await unmount();
        }
    });

    it("unfolds the graph again on the way out of the decision", async () => {
        const { container, unmount } = await mountedAt(2);
        const cluster = container.querySelector<SVGGElement>(
            "[data-graph-cluster]",
        );
        const scaleOf = () =>
            Number(
                /matrix\(([\d.]+)/.exec(
                    cluster?.getAttribute("transform") ?? "",
                )?.[1] ?? 1,
            );

        const gather = buildPhaseTransition(2);
        const release = buildPhaseTransition(3);

        try {
            gather.progress(1);
            expect(scaleOf()).toBeLessThan(0.3);

            // Visibly, rather than by snapping back: still mid-way at the
            // halfway point of the tween.
            release.progress(0.35);
            const midway = scaleOf();
            expect(midway).toBeGreaterThan(0.3);
            expect(midway).toBeLessThan(1);

            release.progress(1);
            expect(scaleOf()).toBeCloseTo(1, 1);
        } finally {
            gather.kill();
            release.kill();
            await unmount();
        }
    });

    it("returns the clusters to the identity matrix, however many round trips", async () => {
        const { container, unmount } = await mountedAt(2);
        const clusters = [
            ...container.querySelectorAll<SVGGElement>("[data-graph-cluster]"),
        ];
        const transforms = () =>
            clusters.map((cluster) => cluster.getAttribute("transform"));

        try {
            // An origin-compensating tween leaves a small residue each way. It
            // is invisible for one pass and throws the graph off the canvas
            // after a couple, so assert the exact matrix rather than a scale.
            for (let pass = 0; pass < 3; pass += 1) {
                const gather = buildPhaseTransition(2);
                gather.progress(1);
                gather.kill();

                const release = buildPhaseTransition(3);
                release.progress(1);
                release.kill();

                expect(transforms()).toEqual(
                    clusters.map(() => "matrix(1,0,0,1,0,0)"),
                );
            }
        } finally {
            await unmount();
        }
    });

    it("keeps context in flight for the whole of the first scene", async () => {
        const { container, unmount } = await mountedAt(0);
        const loop = buildAmbientLoop(0);

        try {
            const inFlight = (time: number) => {
                loop.time(time);
                return [
                    ...container.querySelectorAll<SVGCircleElement>(
                        "[data-context-packet]",
                    ),
                ].filter((packet) => Number(packet.style.opacity) > 0.1).length;
            };

            // A single sparse volley leaves the scene looking static; every
            // sample through the loop should have packets moving.
            for (const time of [0.6, 1.2, 2.6, 3.2]) {
                expect(inFlight(time)).toBeGreaterThan(0);
            }
        } finally {
            loop.kill();
            await unmount();
        }
    });
});
