import { Label, SectionHead } from "./lumen";

type NodeType = {
    term: string;
    body: string;
    tone: "primary" | "chord";
};

/** The four node kinds the graph actually stores. */
const TYPES: NodeType[] = [
    {
        term: "Personas",
        body: "Quién sostiene qué parte del conocimiento, y con quién se conecta.",
        tone: "primary",
    },
    {
        term: "Decisiones",
        body: "Lo que se resolvió, cuándo y sobre qué base. No sólo el resultado.",
        tone: "chord",
    },
    {
        term: "Documentos",
        body: "Atados al proyecto y a la decisión que los originó, no sueltos en una carpeta.",
        tone: "primary",
    },
    {
        term: "Criterio",
        body: "Las reglas que nadie escribió: qué se prioriza, qué se descarta y por qué.",
        tone: "chord",
    },
];

/**
 * The centred band. Every other section is left-aligned, so this one break in
 * alignment is the page's deliberate exception rather than a default.
 */
export function LandingContinuity() {
    return (
        <section
            id="continuidad"
            className="relative scroll-mt-24 overflow-clip border-border border-b bg-secondary/40"
        >
            <div className="relative shell pt-[clamp(3.5rem,8vw,6rem)] pb-[clamp(4rem,9vw,7rem)]">
                <SectionHead
                    align="center"
                    kicker="Qué guarda"
                    title="Cuatro tipos de nodo. Una sola estructura."
                    className="mx-auto"
                />

                <ul className="mt-[var(--space-2xl)] grid grid-cols-[minmax(0,1fr)] gap-[var(--space-md)] sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(4,minmax(0,1fr))]">
                    {TYPES.map((type) => (
                        <li
                            key={type.term}
                            className="lumen-card p-[var(--space-lg)] text-center"
                        >
                            <Label
                                className={
                                    type.tone === "primary"
                                        ? "text-primary"
                                        : "text-brand-chord"
                                }
                            >
                                Nodo
                            </Label>
                            <h3 className="mt-2 font-display text-3xl text-foreground leading-none">
                                {type.term}
                            </h3>
                            <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                                {type.body}
                            </p>
                        </li>
                    ))}
                </ul>

                <p className="mx-auto mt-[var(--space-xl)] max-w-[56ch] text-center text-muted-foreground leading-relaxed">
                    Un grafo de conocimiento no es un buscador con otro nombre:
                    guarda las relaciones, que es exactamente lo que un
                    documento pierde.
                </p>
            </div>
        </section>
    );
}
