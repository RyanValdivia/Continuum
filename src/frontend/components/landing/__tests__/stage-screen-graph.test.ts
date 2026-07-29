import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StageScreenGraph } from "../stage-screen-graph";

function count(markup: string, attribute: string): number {
    return markup.match(new RegExp(attribute, "g"))?.length ?? 0;
}

describe("StageScreenGraph", () => {
    const markup = renderToStaticMarkup(createElement(StageScreenGraph));

    it("renders a dense four-cluster graph", () => {
        expect(markup).toContain("data-graph-camera");
        expect(count(markup, "data-graph-cluster=")).toBe(4);
        expect(count(markup, "data-graph-node=")).toBe(35);
        expect(count(markup, "data-graph-edge=")).toBe(57);
    });

    it("exposes decision and integration targets", () => {
        expect(count(markup, 'data-decision-route="true"')).toBe(4);
        expect(count(markup, 'data-phase-four-node="true"')).toBe(4);
        expect(count(markup, 'data-phase-four-edge="true"')).toBe(9);
    });

    it("labels only meaningful hubs", () => {
        for (const label of [
            "Personas",
            "Decisiones",
            "Documentos",
            "Criterios",
        ]) {
            expect(markup).toContain(label);
        }
    });
});
