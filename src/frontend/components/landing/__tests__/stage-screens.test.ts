import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StageScreen } from "../stage-screens";

function count(markup: string, attribute: string): number {
    return markup.match(new RegExp(attribute, "g"))?.length ?? 0;
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
});
