import { StageShader } from "./brand-shader";
import { Label, SectionHead } from "./lumen";
import { GsapReveal } from "./motion";

type Stage = {
    n: string;
    kicker: string;
    when: string;
    title: string;
    body: React.ReactNode;
    chips: string[];
    tone: "primary" | "chord";
};

const STAGES: Stage[] = [
    {
        n: "1",
        kicker: "Conectar",
        when: "Día uno",
        title: "Enchufa las fuentes que ya usas",
        body: (
            <>
                Notion, Slack, Microsoft 365 y la revisión de documentos entran
                tal como están.{" "}
                <strong className="font-medium text-foreground">
                    Nadie migra nada
                </strong>{" "}
                ni cambia de herramienta: el equipo sigue trabajando donde
                trabaja.
            </>
        ),
        chips: ["4 fuentes", "Sin migración"],
        tone: "primary",
    },
    {
        n: "2",
        kicker: "Mapear",
        when: "En segundo plano",
        title: "El grafo se construye solo",
        body: (
            <>
                Cada página, hilo y documento se resuelve contra la persona y el
                proyecto que le corresponden.{" "}
                <strong className="font-medium text-foreground">
                    Lo que se guarda son las relaciones
                </strong>
                , no una copia más del archivo.
            </>
        ),
        chips: ["4 tipos de nodo", "Automático"],
        tone: "chord",
    },
    {
        n: "3",
        kicker: "Consultar",
        when: "Cuando haga falta",
        title: "Un agente por puesto",
        body: (
            <>
                Cada puesto tiene un agente que responde con el criterio de
                quien lo ocupa —{" "}
                <strong className="font-medium text-foreground">
                    no con el primer documento que encuentra
                </strong>
                .
            </>
        ),
        chips: ["Agente por puesto", "Con contexto"],
        tone: "primary",
    },
    {
        n: "4",
        kicker: "Mantener",
        when: "Continuo",
        title: "El grafo no envejece",
        body: (
            <>
                Cada sync trae lo nuevo y lo vuelve a atar a la persona y al
                proyecto correctos, así que{" "}
                <strong className="font-medium text-foreground">
                    lo que respondes hoy sigue siendo cierto mañana
                </strong>
                .
            </>
        ),
        chips: ["Sync continuo", "Sin mantenimiento manual"],
        tone: "chord",
    },
];

export function LandingStages() {
    return (
        <section id="etapas" className="scroll-mt-24 border-border border-b">
            <div className="shell pt-[clamp(3.5rem,8vw,6rem)] pb-[clamp(4rem,9vw,7rem)]">
                <SectionHead
                    kicker="Cómo funciona"
                    title="Cuatro etapas, de la fuente a la ruta."
                    lede="Las mismas cuatro, siempre en el mismo orden. Continuum sostiene la estructura para que tú no tengas que recordarla."
                />

                <GsapReveal
                    selector=":scope > li"
                    className="mt-[var(--space-2xl)]"
                >
                    <ol className="grid gap-[var(--space-lg)]">
                        {STAGES.map((stage, i) => (
                            <li
                                key={stage.n}
                                className="grid gap-[var(--space-md)] sm:grid-cols-[4.5rem_minmax(0,1fr)]"
                            >
                                {/* Numeral badge + the rail that threads the stages. */}
                                <div className="hidden flex-col items-center sm:flex">
                                    <span
                                        data-badge
                                        className={`grid size-[4.5rem] shrink-0 place-items-center rounded-[var(--radius-card)] font-display text-3xl ${
                                            stage.tone === "primary"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-brand-chord text-background"
                                        }`}
                                    >
                                        {stage.n}
                                        <span className="sr-only">.0</span>
                                    </span>
                                    {i < STAGES.length - 1 ? (
                                        <span
                                            aria-hidden
                                            data-rail
                                            className="w-px flex-1 bg-border"
                                        />
                                    ) : null}
                                </div>

                                <article className="lumen-card grid gap-[var(--space-lg)] p-[var(--space-lg)] md:grid-cols-[minmax(0,1fr)_14rem] md:items-center md:p-[var(--space-xl)]">
                                    <div className="min-w-0">
                                        <Label
                                            className={
                                                stage.tone === "primary"
                                                    ? "text-primary"
                                                    : "text-brand-chord"
                                            }
                                        >
                                            {stage.n}.0 · {stage.kicker} ·{" "}
                                            {stage.when}
                                        </Label>
                                        <h3 className="mt-2 font-display text-2xl text-foreground leading-tight sm:text-3xl">
                                            {stage.title}
                                        </h3>
                                        <p className="mt-3 max-w-[56ch] text-muted-foreground leading-relaxed">
                                            {stage.body}
                                        </p>
                                        <div className="mt-[var(--space-lg)] flex flex-wrap gap-2">
                                            {stage.chips.map((chip) => (
                                                <span
                                                    key={chip}
                                                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-secondary px-3 py-1.5"
                                                >
                                                    <span
                                                        aria-hidden
                                                        className={`size-1.5 rounded-full ${
                                                            stage.tone ===
                                                            "primary"
                                                                ? "bg-primary"
                                                                : "bg-brand-chord"
                                                        }`}
                                                    />
                                                    <Label className="text-muted-foreground">
                                                        {chip}
                                                    </Label>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* The shader carries this panel — a different
                                    one per stage, so the four rows never read
                                    as one card recoloured four times. */}
                                    <figure className="relative hidden aspect-square place-items-center overflow-hidden rounded-[var(--radius-card)] border border-primary/25 bg-primary/10 md:grid">
                                        <StageShader index={i} />
                                        <div className="relative">
                                            <StageArt index={i} />
                                        </div>
                                    </figure>
                                </article>
                            </li>
                        ))}
                    </ol>
                </GsapReveal>
            </div>
        </section>
    );
}

/**
 * One distinct hand-built mark per stage — never the same shape recoloured.
 *
 * The mark is drawn in ink, not in the accent: the shader behind it already
 * carries the accent, and an azure mark on the bright regions of the azure
 * shader washed out completely. A drop shadow keeps the strokes separated from
 * whatever the shader happens to be doing underneath.
 */
function StageArt({ index }: { index: number }) {
    const stroke = "stroke-foreground";
    const fill = "fill-foreground";

    return (
        <svg
            viewBox="0 0 96 96"
            aria-hidden
            className="size-20 [filter:drop-shadow(0_1px_4px_rgb(0_0_0/0.55))]"
        >
            <title>{`Etapa ${index + 1}`}</title>
            {index === 0 ? (
                <g>
                    {[20, 40, 60, 80].map((y) => (
                        <g key={y}>
                            <line
                                x1="14"
                                y1={y}
                                x2="62"
                                y2={y}
                                className={stroke}
                                strokeWidth="2"
                            />
                            <circle cx="14" cy={y} r="4" className={fill} />
                        </g>
                    ))}
                    <rect
                        x="62"
                        y="28"
                        width="22"
                        height="44"
                        rx="6"
                        className={`${stroke} fill-none`}
                        strokeWidth="2"
                    />
                </g>
            ) : null}
            {index === 1 ? (
                <g>
                    <line
                        x1="26"
                        y1="26"
                        x2="48"
                        y2="48"
                        className={stroke}
                        strokeWidth="2"
                    />
                    <line
                        x1="70"
                        y1="26"
                        x2="48"
                        y2="48"
                        className={stroke}
                        strokeWidth="2"
                    />
                    <line
                        x1="26"
                        y1="70"
                        x2="48"
                        y2="48"
                        className={stroke}
                        strokeWidth="2"
                    />
                    <line
                        x1="70"
                        y1="70"
                        x2="48"
                        y2="48"
                        className={stroke}
                        strokeWidth="2"
                    />
                    <circle cx="48" cy="48" r="10" className={fill} />
                    {[
                        [26, 26],
                        [70, 26],
                        [26, 70],
                        [70, 70],
                    ].map(([cx, cy]) => (
                        <circle
                            key={`${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r="6"
                            className={`${stroke} fill-none`}
                            strokeWidth="2"
                        />
                    ))}
                </g>
            ) : null}
            {index === 2 ? (
                <g>
                    <rect
                        x="14"
                        y="22"
                        width="68"
                        height="42"
                        rx="12"
                        className={`${stroke} fill-none`}
                        strokeWidth="2"
                    />
                    <path d="M34 64 L34 78 L48 64 Z" className={fill} />
                    <circle cx="36" cy="43" r="4" className={fill} />
                    <circle cx="48" cy="43" r="4" className={fill} />
                    <circle cx="60" cy="43" r="4" className={fill} />
                </g>
            ) : null}
            {index === 3 ? (
                <g>
                    <path
                        d="M18 78 C 18 46, 78 50, 78 18"
                        className={`${stroke} fill-none`}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    {[
                        [18, 78],
                        [40, 62],
                        [62, 40],
                        [78, 18],
                    ].map(([cx, cy], i) => (
                        <circle
                            key={`${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={i === 3 ? 7 : 5}
                            className={i === 3 ? fill : `${stroke} fill-none`}
                            strokeWidth="2"
                        />
                    ))}
                </g>
            ) : null}
        </svg>
    );
}
