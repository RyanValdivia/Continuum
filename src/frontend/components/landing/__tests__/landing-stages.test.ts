import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LandingStages } from "../stages";

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
        "Cada decisión llega con su contexto",
        "Contexto compartido",
        "Criterios conectados",
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
            "Una decisión conecta su contexto relevante: precedentes, personas, documentos y criterios.",
            "Una señal nueva se integra como nodo, crea relaciones y modifica el grafo.",
        ]) {
            expect(screen).toContain(summary);
        }
    });
});
