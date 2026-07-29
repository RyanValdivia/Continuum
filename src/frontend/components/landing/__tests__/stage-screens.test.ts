/** @vitest-environment happy-dom */

import { gsap } from "gsap";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StageScreen, shouldPauseAmbient } from "../stage-screens";

type MatchMediaConfig = {
    desktop: boolean;
    reduceMotion: boolean;
};

type VisibilityController = {
    setHidden: (hidden: boolean) => void;
    restore: () => void;
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

function mockDocumentVisibility(initialHidden: boolean): VisibilityController {
    const previousDescriptor = Object.getOwnPropertyDescriptor(
        document,
        "hidden",
    );

    const setHidden = (hidden: boolean): void => {
        Object.defineProperty(document, "hidden", {
            configurable: true,
            value: hidden,
        });
    };

    setHidden(initialHidden);

    return {
        setHidden,
        restore: () => {
            if (previousDescriptor) {
                Object.defineProperty(document, "hidden", previousDescriptor);
                return;
            }

            delete (document as { hidden?: boolean }).hidden;
        },
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
        expect(screen).toContain("data-decision-focus");
        expect(screen).toContain("data-integration-signal");
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
        expect(count(screen, 'data-phase-four-node="true"')).toBe(1);
        expect(count(screen, 'data-phase-four-edge="true"')).toBe(3);
        expect(screen).toContain("data-decision-particle");
        expect(screen).toContain("data-integration-wave");
        expect(screen).toContain("data-continuum-core");
    });

    it("exposes pause decision helper states", () => {
        expect(
            shouldPauseAmbient({
                isHidden: true,
                active: true,
                transitionComplete: false,
                ambientReady: false,
            }),
        ).toBe(true);
        expect(
            shouldPauseAmbient({
                isHidden: false,
                active: false,
                transitionComplete: true,
                ambientReady: true,
            }),
        ).toBe(true);
        expect(
            shouldPauseAmbient({
                isHidden: false,
                active: true,
                transitionComplete: false,
                ambientReady: true,
            }),
        ).toBe(true);
        expect(
            shouldPauseAmbient({
                isHidden: false,
                active: true,
                transitionComplete: true,
                ambientReady: true,
            }),
        ).toBe(false);
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

            expect(sources.opacity).toBe("0.5");
            expect(graph.opacity).toBe("1");
            expect(decision.opacity).toBe("1");
            expect(integration.opacity).toBe("1");

            const phaseFourNode = container.querySelector<SVGGraphicsElement>(
                '[data-phase-four-node="true"]',
            );
            const phaseFourEdges = container.querySelectorAll<SVGLineElement>(
                '[data-phase-four-edge="true"]',
            );

            expect(phaseFourNode?.style.opacity).toBe("1");
            for (const edge of phaseFourEdges) {
                expect(edge.style.opacity).toBe("1");
            }
        } finally {
            await unmount();
        }
    });

    it("keeps ambient paused until transition completion when visibility toggles", async () => {
        const visibility = mockDocumentVisibility(true);
        const eventCallbackSpy = vi.spyOn(
            gsap.core.Timeline.prototype,
            "eventCallback",
        );
        const playSpy = vi.spyOn(gsap.core.Timeline.prototype, "play");

        const { unmount } = await mountStageScreen(
            { activeStage: 1, active: true },
            { desktop: true, reduceMotion: false },
        );

        try {
            let onComplete: (() => void) | undefined;
            for (const call of eventCallbackSpy.mock.calls as unknown as Array<
                [string, unknown, ...unknown[]]
            >) {
                const [name, callback] = call;
                if (name === "onComplete" && typeof callback === "function") {
                    onComplete = callback as () => void;
                    break;
                }
            }

            expect(onComplete).toBeTypeOf("function");
            expect(playSpy).toHaveBeenCalledTimes(0);

            visibility.setHidden(false);
            document.dispatchEvent(new Event("visibilitychange"));

            expect(
                shouldPauseAmbient({
                    isHidden: false,
                    active: true,
                    transitionComplete: false,
                    ambientReady: false,
                }),
            ).toBe(true);
            expect(playSpy).toHaveBeenCalledTimes(0);

            onComplete?.();

            expect(playSpy).toHaveBeenCalledTimes(1);
        } finally {
            visibility.restore();
            eventCallbackSpy.mockRestore();
            playSpy.mockRestore();
            await unmount();
        }
    });
});
