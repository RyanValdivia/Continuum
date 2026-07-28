import { CtaButton } from "./cta-button";
import { CeoGraph } from "./demo/ceo-graph";
import { Label } from "./lumen";
import { GsapIntro } from "./motion";

const STAGES = [
    { n: "01", label: "Conectar", tone: "bg-primary" },
    { n: "02", label: "Mapear", tone: "bg-brand-chord" },
    { n: "03", label: "Consultar", tone: "bg-primary" },
    { n: "04", label: "Mantener", tone: "bg-brand-chord" },
];

/**
 * Split hero on the hum-07 model: a stage rail above the headline, display type
 * with one accent verb, two pill CTAs and a mono source line — with a real
 * graph on the right, rendered by the same SDK and node components as the
 * interactive one further down.
 */
export function LandingHero() {
    return (
        <section className="relative overflow-clip border-border border-b">
            <GsapIntro>
                <div className="shell relative pt-[clamp(2.5rem,6vw,4rem)]">
                    {/* Stage rail — the page's spine, previewed. Full width so the
                    four chips never wrap into a dangling connector. */}
                    <ol
                        data-intro
                        className="flex flex-wrap items-center gap-y-2"
                    >
                        {STAGES.map((stage, i) => (
                            <li
                                key={stage.n}
                                className="flex items-center gap-2"
                            >
                                <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5">
                                    <span
                                        aria-hidden
                                        className={`size-1.5 rounded-full ${stage.tone}`}
                                    />
                                    <Label className="text-muted-foreground">
                                        {stage.n} {stage.label}
                                    </Label>
                                </span>
                                {i < STAGES.length - 1 ? (
                                    <span
                                        aria-hidden
                                        className="hidden h-px w-5 bg-border sm:block"
                                    />
                                ) : null}
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="shell relative grid items-center gap-[var(--space-2xl)] pt-[var(--space-xl)] pb-[clamp(4rem,9vw,7rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                    <div>
                        <h1
                            data-intro
                            className="max-w-[15ch] font-display text-[length:var(--text-display)] text-foreground leading-[1.02] tracking-[-0.028em]"
                        >
                            El conocimiento de tu empresa,{" "}
                            <em className="lumen-verb">conectado</em>.
                        </h1>

                        <p
                            data-intro
                            className="mt-[var(--space-lg)] max-w-[52ch] text-lg text-muted-foreground leading-relaxed"
                        >
                            Continuum construye un grafo vivo de personas,
                            decisiones, documentos y criterio — y deja que
                            preguntes sobre él. Un activo de la empresa, no una
                            carpeta compartida.
                        </p>

                        <div
                            data-intro
                            className="mt-[var(--space-xl)] flex flex-wrap items-center gap-[var(--space-md)]"
                        >
                            <CtaButton href="/auth/sign-in">
                                Construir mi grafo
                            </CtaButton>
                            <a
                                href="#etapas"
                                className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-border px-5 font-medium text-primary text-sm outline-none transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4 active:translate-y-px"
                            >
                                Ver las cuatro etapas
                                <span aria-hidden>→</span>
                            </a>
                        </div>

                        <p data-intro className="mt-[var(--space-lg)]">
                            <Label className="text-muted-foreground">
                                Notion · Slack · Microsoft 365 · Revisión de
                                documentos
                            </Label>
                        </p>
                    </div>

                    {/* The same renderer the product ships — a live graph, not a
                    drawing of one. Read-only here; the section below is driveable. */}
                    <div className="relative">
                        <div data-intro-aside>
                            <CeoGraph
                                interactive={false}
                                heightClass="h-[19rem] sm:h-[21rem]"
                            />
                        </div>

                        <div
                            data-intro-aside
                            className="lumen-card -mt-[var(--space-lg)] relative mx-[var(--space-lg)] p-[var(--space-lg)]"
                        >
                            <Label className="text-brand-chord">
                                Agente · Head of Sales
                            </Label>
                            <p className="mt-2 text-muted-foreground text-sm leading-snug">
                                «¿Puedo cerrar este deal con 20 % de descuento?»
                            </p>
                            <p className="mt-2 text-foreground text-sm leading-snug">
                                No sin aprobación — el tope sin escalar es 15 %.
                            </p>
                        </div>
                    </div>
                </div>
            </GsapIntro>
        </section>
    );
}
