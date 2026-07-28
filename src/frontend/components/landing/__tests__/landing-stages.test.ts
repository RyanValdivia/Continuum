import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingStages } from "../stages";

describe("LandingStages", () => {
    it("keeps every stage available to assistive technology", () => {
        const screen = renderToStaticMarkup(createElement(LandingStages));

        expect(screen).toContain('aria-hidden="true" class="shell relative"');
        expect(screen).toContain('aria-label="Todas las etapas"');

        const accessibleScenes = screen.slice(
            screen.indexOf('aria-label="Todas las etapas"'),
        );

        for (const content of [
            "Conectar",
            "Día uno",
            "Enchufa las fuentes que ya usas",
            "Notion, Slack, Microsoft 365 y la revisión de documentos entran",
            "Mapear",
            "En segundo plano",
            "El grafo se construye solo",
            "Cada página, hilo y documento se resuelve contra la persona",
            "Consultar",
            "Cuando haga falta",
            "Un agente por puesto",
            "Cada puesto tiene un agente que responde con el criterio",
            "Mantener",
            "Continuo",
            "El grafo no envejece",
            "Cada sync trae lo nuevo y lo vuelve a atar a la persona",
        ]) {
            expect(accessibleScenes).toContain(content);
        }
    });
});
