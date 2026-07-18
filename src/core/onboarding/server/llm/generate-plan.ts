import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { ServerConfig } from "@/config/server-config";
import { onboardingPlanOutputSchema } from "@/core/onboarding/domain/schemas";
import type { OnboardingPlanOutput } from "@/core/onboarding/domain/types";

export const ONBOARDING_MODEL = "gemini-2.5-flash";

export interface GenerateOnboardingInput {
    roleTitle: string;
    /** The predecessor whose agent `talk` tasks open (e.g. "María"), if any. */
    benchmarkPersonName: string | null;
    /** Plain-text role digest built from the knowledge graph. */
    digest: string;
}

/** The generation seam — tests inject a deterministic fake. */
export type GenerateOnboardingFn = (
    input: GenerateOnboardingInput,
) => Promise<OnboardingPlanOutput>;

const SYSTEM_PROMPT = `Diseñas el onboarding de una persona recién contratada en una empresa concreta.
Te dan el rol y un digest del conocimiento real capturado de ese puesto (decisiones,
procesos, conceptos y extractos de fuentes internas).

Genera un plan de 2 a 5 días. Cada día tiene 1 a 5 tareas. Cada tarea:
- type: "read" (estudiar un doc/concepto interno), "talk" (preguntar al agente de la
  persona predecesora sobre una decisión real) o "do" (hacer algo concreto).
- title: acción corta.
- detail: qué hacer, anclado al conocimiento real del digest — cita decisiones/procesos concretos.
- competency: qué competencia desarrolla esa tarea (como el "qué mide" de una pregunta de entrevista).

Usa tareas "talk" para las decisiones y el "por qué" que sólo vive en la cabeza del predecesor.
Escribe en el idioma del digest. Progresa de contexto general a autonomía.`;

const google = createGoogleGenerativeAI({ apiKey: ServerConfig.googleApiKey });

export const googleGenerateOnboarding: GenerateOnboardingFn = async (input) => {
    const { output } = await generateText({
        model: google(ONBOARDING_MODEL),
        output: Output.object({ schema: onboardingPlanOutputSchema }),
        system: SYSTEM_PROMPT,
        prompt: [
            `Rol: ${input.roleTitle}`,
            input.benchmarkPersonName
                ? `Predecesor (su agente responde las tareas "talk"): ${input.benchmarkPersonName}`
                : 'Sin predecesor: las tareas "talk" consultan el conocimiento general de la empresa.',
            "",
            "=== DIGEST DEL ROL ===",
            input.digest,
        ].join("\n"),
    });
    return output;
};
