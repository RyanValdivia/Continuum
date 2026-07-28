import { Label, SectionHead } from "./lumen";

type Source = {
    name: string;
    body: string;
    status: string;
    /** 5-col spans — 3/2 then 2/3, so no row is a set of equal tiles. */
    span: string;
};

/** Every entry below ships in the product today — see `src/core/*`. */
const SOURCES: Source[] = [
    {
        name: "Notion",
        body: "Páginas, bases de datos y sus relaciones entran como nodos, no como texto plano. La jerarquía del workspace se conserva.",
        status: "Conector",
        span: "lg:col-span-3",
    },
    {
        name: "Slack",
        body: "Los hilos donde se decide algo quedan atados a la persona y al proyecto.",
        status: "Conector",
        span: "lg:col-span-2",
    },
    {
        name: "Microsoft 365",
        body: "Teams y la identidad de la organización se resuelven contra el mismo grafo.",
        status: "Conector",
        span: "lg:col-span-2",
    },
    {
        name: "Documentos",
        body: "La revisión de documentos extrae decisiones y criterio, no sólo párrafos — y los cuelga del nodo que les corresponde.",
        status: "Nativo",
        span: "lg:col-span-3",
    },
];

export function LandingSources() {
    return (
        <section id="fuentes" className="scroll-mt-24 border-border border-b">
            <div className="shell pt-[clamp(3.5rem,8vw,6rem)] pb-[clamp(4rem,9vw,7rem)]">
                <SectionHead
                    kicker="Fuentes"
                    title="El grafo se alimenta de donde ya trabajas."
                    lede="Nada que copiar y pegar. Continuum lee las herramientas que el equipo ya usa y las convierte en estructura."
                />

                <ul className="mt-[var(--space-2xl)] grid grid-cols-[minmax(0,1fr)] gap-[var(--space-md)] sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(5,minmax(0,1fr))]">
                    {SOURCES.map((source) => (
                        <li
                            key={source.name}
                            className={`lumen-card flex flex-col gap-2 p-[var(--space-lg)] ${source.span}`}
                        >
                            <Label className="text-muted-foreground">
                                {source.status}
                            </Label>
                            <h3 className="font-display text-3xl text-foreground leading-none">
                                {source.name}
                            </h3>
                            <p className="max-w-[46ch] text-muted-foreground text-sm leading-relaxed">
                                {source.body}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
