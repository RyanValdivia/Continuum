import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StageScreen } from "../stage-screens";

describe("StageScreen", () => {
    it.each([
        [0, ["Notion", "Slack", "Microsoft 365", "Documentos", "Continuum"]],
        [1, ["Persona", "Decisión", "Documento", "Criterio", "Grafo"]],
        [
            2,
            [
                "Head of Sales",
                "¿Puedo cerrar este deal con 20 % de descuento?",
                "15 %",
                "Fuentes",
            ],
        ],
        [
            3,
            ["Slack", "Notion", "Microsoft 365", "Actualizado", "Grafo al día"],
        ],
    ])("renders required accessible content for stage %s", (index, content) => {
        const screen = renderToStaticMarkup(
            createElement(StageScreen, { index }),
        );

        expect(screen).toContain("<figure");
        expect(screen).toMatch(/<figure[^>]*><figcaption/);

        for (const text of content) {
            expect(screen).toContain(text);
        }
    });
});
