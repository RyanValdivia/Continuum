import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StageScreen } from "../stage-screens";

const MOTION_CONTRACT = [
    {
        index: 0,
        kind: "sources",
        items: { source: 4, connector: 4, core: 1 },
    },
    {
        index: 1,
        kind: "graph",
        items: { node: 4, edge: 1, core: 1 },
    },
    {
        index: 2,
        kind: "agent",
        items: { question: 1, answer: 1, source: 2 },
    },
    {
        index: 3,
        kind: "freshness",
        items: { source: 3, status: 3, core: 1 },
    },
] as const;

function countAttribute(markup: string, attribute: string): number {
    return markup.match(new RegExp(attribute, "g"))?.length ?? 0;
}

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
            createElement(StageScreen, { index, active: true }),
        );

        expect(screen).toContain("<figure");
        expect(screen).toMatch(/<figure[^>]*><figcaption/);

        for (const text of content) {
            expect(screen).toContain(text);
        }
    });

    it.each(MOTION_CONTRACT)("renders scoped motion targets for $kind", ({
        index,
        kind,
        items,
    }) => {
        const screen = renderToStaticMarkup(
            createElement(StageScreen, { index, active: true }),
        );

        expect(screen).toContain(`data-stage-motion="${kind}"`);
        expect(screen).toContain('data-stage-active="true"');

        for (const [item, count] of Object.entries(items)) {
            expect(countAttribute(screen, `data-stage-item="${item}"`)).toBe(
                count,
            );
        }
    });
});
