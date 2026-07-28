import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingStages } from "../stages";

describe("LandingStages", () => {
    it("keeps every stage available to assistive technology", () => {
        const screen = renderToStaticMarkup(createElement(LandingStages));

        expect(screen).toContain("Cómo funciona");
        expect(screen).toContain("Cuatro etapas, de la fuente a la ruta.");
        expect(screen).toContain(
            "Las mismas cuatro, siempre en el mismo orden. Continuum sostiene la estructura para que tú no tengas que recordarla.",
        );
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
            "Notion, Slack, Microsoft 365 y Documentos convergen en Continuum.",
            "4 fuentes",
            "Sin migración",
            "Mapear",
            "En segundo plano",
            "El grafo se construye solo",
            "Cada página, hilo y documento se resuelve contra la persona",
            "Persona, Decisión, Documento y Criterio están relacionados por el Grafo.",
            "4 tipos de nodo",
            "Automático",
            "Consultar",
            "Cuando haga falta",
            "Un agente por puesto",
            "Cada puesto tiene un agente que responde con el criterio",
            "Head of Sales pregunta si puede cerrar con 20 % de descuento. Sin aprobación, el tope es 15 %. Las fuentes son Política comercial en Notion y Aprobaciones de descuento en Slack.",
            "Agente por puesto",
            "Con contexto",
            "Mantener",
            "Continuo",
            "El grafo no envejece",
            "Cada sync trae lo nuevo y lo vuelve a atar a la persona",
            "Slack, Notion y Microsoft 365 están actualizados; el Grafo está al día.",
            "Sync continuo",
            "Sin mantenimiento manual",
        ]) {
            expect(accessibleScenes).toContain(content);
        }
    });
});
