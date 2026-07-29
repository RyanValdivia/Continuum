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
        // Holds the whole viewport, minus the nav above it, so the opening view
        // is one screen rather than a screen and a strip of the next.
        <section className="relative grid overflow-clip border-border border-b lg:min-h-[calc(100svh-var(--nav-height))]">
            <GsapIntro className="grid content-center">
                <div className="shell relative pt-[clamp(2.5rem,6vw,4rem)] lg:pt-0">
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

                <div className="shell relative grid items-center gap-[var(--space-2xl)] pt-[var(--space-xl)] pb-[clamp(4rem,9vw,7rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:pb-[var(--space-2xl)]">
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

                        {/* The two CTAs on the left ask for a decision. This one
                            asks for nothing — it names what is further down, so
                            the graph above reads as a promise the page keeps
                            rather than an illustration. */}
                        <a
                            data-intro-aside
                            href="#etapas"
                            className="group mt-[var(--space-lg)] flex items-center justify-between gap-[var(--space-lg)] rounded-[var(--radius-card)] border border-border px-[var(--space-lg)] py-[var(--space-md)] outline-none transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4"
                        >
                            <span className="min-w-0">
                                <Label className="text-primary">
                                    Sigue bajando
                                </Label>
                                <span className="mt-1 block text-muted-foreground text-sm leading-snug">
                                    Cómo se construye este grafo, y cómo
                                    sostiene una decisión.
                                </span>
                            </span>
                            <span
                                aria-hidden
                                className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-primary transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] group-hover:translate-y-0.5"
                            >
                                ↓
                            </span>
                        </a>
                    </div>
                </div>
            </GsapIntro>
        </section>
    );
}
