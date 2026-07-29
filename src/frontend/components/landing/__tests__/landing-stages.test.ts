/** @vitest-environment happy-dom */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LandingStages } from "../stages";

// happy-dom does not implement requestAnimationFrame. Importing "../stages"
// registers GSAP's ScrollTrigger plugin, whose background ticker schedules a
// deferred rAF call; without this polyfill it throws after teardown.
if (typeof globalThis.requestAnimationFrame === "undefined") {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
        setTimeout(() => callback(Date.now()), 16) as unknown as number;
    globalThis.cancelAnimationFrame = (handle: number) => {
        clearTimeout(handle);
    };
}

const STAGE_COPY = [
    [
        "Conectar",
        "Día uno",
        "Conecta lo que tu equipo ya sabe",
        "Sin migración",
        "Contexto desde el origen",
    ],
    [
        "Mapear",
        "En segundo plano",
        "El contexto encuentra sus relaciones",
        "Grafo automático",
        "Relaciones vivas",
    ],
    [
        "Decidir",
        "Antes de actuar",
        "Todo el grafo converge en una decisión",
        "Contexto completo",
        "Decisiones defendibles",
    ],
    [
        "Mantener",
        "Continuo",
        "Cada señal hace evolucionar el grafo",
        "Sync continuo",
        "Topología viva",
    ],
] as const;

type MockBrandShaderProps = {
    activeStage?: 0 | 1 | 2 | 3;
    variant?: "field" | "panel" | "band" | "constellation";
    className?: string;
    desktopMotionOnly?: boolean;
};

const brandShaderCalls: MockBrandShaderProps[] = [];

vi.mock("../brand-shader", () => ({
    SCENE_EDGE_FADE: "scene-edge-fade",
    BrandShader: ({
        activeStage,
        variant,
        className,
        ...props
    }: MockBrandShaderProps) => {
        const tracked: MockBrandShaderProps = {
            activeStage,
            variant,
            ...(className !== undefined ? { className } : {}),
            ...props,
        };

        brandShaderCalls.push(tracked);

        return createElement("div", {
            "data-brand-shader": "",
            "data-active-stage": `${activeStage}`,
            "data-variant": variant,
            ...(className !== undefined
                ? ({ "data-class-name": className } as const)
                : {}),
        });
    },
}));

describe("LandingStages", () => {
    const screen = renderToStaticMarkup(createElement(LandingStages));

    it("keeps four revised stages available to assistive technology", () => {
        expect(screen).toContain("Cómo funciona");
        expect(screen).toContain('aria-label="Todas las etapas"');
        expect(screen.match(/<h2(?:\s|>)/g)).toHaveLength(1);
        expect(screen.match(/<h3(?:\s|>)/g)).toHaveLength(8);

        const accessibleScenes = screen.slice(
            screen.indexOf('aria-label="Todas las etapas"'),
        );
        for (const stage of STAGE_COPY) {
            for (const content of stage)
                expect(accessibleScenes).toContain(content);
        }
    });

    it("mounts one persistent apparatus instead of four cards", () => {
        expect(screen.match(/data-constellation-narrative/g)).toHaveLength(1);
        expect(screen.match(/data-full-scene/g)).toHaveLength(4);
        expect(screen).toContain('data-stage-active="false"');
        expect(screen).not.toContain("Consultar");
        expect(screen).not.toContain("Head of Sales");
    });

    it("passes constellation settings to BrandShader without class overrides", () => {
        expect(brandShaderCalls).toHaveLength(1);

        const shaderProps = brandShaderCalls[0] ?? {};

        expect(shaderProps.variant).toBe("constellation");
        expect(shaderProps.activeStage).toBe(0);
        expect(shaderProps.className).toBeUndefined();
        expect(screen).toContain('data-variant="constellation"');
        expect(screen).toContain('data-active-stage="0"');
        expect(screen).not.toContain("data-class-name");
    });

    it("describes the complete transformation accessibly", () => {
        for (const summary of [
            "Notion, Slack, Microsoft 365 y documentos aportan decisiones, conversaciones, personas y criterios a Continuum.",
            "Continuum organiza ese contexto en un grafo de personas, decisiones, documentos y criterios relacionados.",
            "Personas, decisiones, documentos y criterios se contraen en un solo núcleo: el contexto completo que un founder necesita para decidir.",
            "Una señal nueva se integra como nodo, crea relaciones y modifica el grafo.",
        ]) {
            expect(screen).toContain(summary);
        }
    });

    describe("accessibility structure", () => {
        function hasHiddenAncestor(element: Element | null): boolean {
            let node = element?.parentElement ?? null;
            while (node) {
                if (node.getAttribute("aria-hidden") === "true") return true;
                node = node.parentElement;
            }
            return false;
        }

        const container = document.createElement("div");
        container.innerHTML = screen;

        it("keeps the stage progress rail outside any aria-hidden ancestor", () => {
            const progress = container.querySelector(
                '[aria-label="Progreso de las etapas"]',
            );

            expect(progress).not.toBeNull();
            expect(hasHiddenAncestor(progress)).toBe(false);
        });

        it("keeps the progress rail's aria-current step available", () => {
            const current = container.querySelector('[aria-current="step"]');

            expect(current).not.toBeNull();
            expect(hasHiddenAncestor(current)).toBe(false);
        });

        it("keeps the constellation figcaption outside any aria-hidden ancestor", () => {
            const figcaption = container.querySelector(
                "[data-constellation-narrative] figcaption",
            );

            expect(figcaption).not.toBeNull();
            expect(hasHiddenAncestor(figcaption)).toBe(false);
        });

        it("keeps the decorative visual copy and sr-only stage list intact", () => {
            const srOnlyList = container.querySelector(
                '[aria-label="Todas las etapas"]',
            );
            expect(srOnlyList).not.toBeNull();
            expect(srOnlyList?.className).toContain("sr-only");

            const visibleCopyList =
                container.querySelectorAll("[data-full-scene]")[0]
                    ?.parentElement;
            expect(visibleCopyList?.getAttribute("aria-hidden")).toBe("true");
        });
    });
});
