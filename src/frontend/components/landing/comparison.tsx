import { BrandShader } from "./brand-shader";
import { Label, SectionHead } from "./lumen";
import { GsapReveal } from "./motion";

type Row = {
    category: string;
    tools: string[];
    does: string;
    lacks: string;
};

const ROWS: Row[] = [
    {
        category: "Búsqueda empresarial",
        tools: ["Glean", "M365 Copilot"],
        does: "Encuentra el documento donde se dijo algo.",
        lacks: "Te devuelve resultados sueltos. Ninguno te dice qué se decidió, ni quién lo sostiene.",
    },
    {
        category: "Documentación",
        tools: ["Guru", "Notion", "Confluence"],
        does: "Guarda las páginas en un sitio ordenado.",
        lacks: "La relación entre una página y la decisión que la originó vive sólo en la cabeza de alguien.",
    },
    {
        category: "Gestión de tareas",
        tools: ["Asana", "ClickUp"],
        does: "Modela el trabajo: quién hace qué y para cuándo.",
        lacks: "Modela la tarea, no el criterio con el que se resolvió.",
    },
];

/**
 * Was a four-column table: too dense to read, horizontally scrolled below
 * 46rem, and it buried the actual argument. Now each category is a card that
 * states its own gap, and the closing card answers all three at once — which is
 * the whole point of the section.
 */
export function LandingComparison() {
    return (
        <section
            id="comparativa"
            className="scroll-mt-24 border-border border-b"
        >
            <div className="shell pt-[clamp(3.5rem,8vw,6rem)] pb-[clamp(4rem,9vw,7rem)]">
                <SectionHead
                    kicker="Comparativa"
                    title="Todas encuentran el archivo. Ninguna guarda el porqué."
                    lede="Las herramientas que ya tienes resuelven el acceso a la información. El criterio con el que se tomó una decisión no vive en ninguna de ellas."
                />

                <GsapReveal
                    selector=":scope > li"
                    className="mt-[var(--space-2xl)]"
                >
                    <ul className="grid gap-[var(--space-md)]">
                        {ROWS.map((row) => (
                            <li
                                key={row.category}
                                className="lumen-card grid gap-[var(--space-lg)] p-[var(--space-lg)] md:grid-cols-[16rem_minmax(0,1fr)] md:p-[var(--space-xl)]"
                            >
                                <div>
                                    <h3 className="font-display text-2xl text-foreground leading-tight">
                                        {row.category}
                                    </h3>
                                    <ul className="mt-3 flex flex-wrap gap-1.5">
                                        {row.tools.map((tool) => (
                                            <li
                                                key={tool}
                                                className="inline-flex whitespace-nowrap rounded-full border border-border px-2.5 py-1"
                                            >
                                                <Label className="text-muted-foreground">
                                                    {tool}
                                                </Label>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="grid gap-[var(--space-lg)] sm:grid-cols-[repeat(2,minmax(0,1fr))]">
                                    <div className="border-border border-t pt-3">
                                        <Label className="text-muted-foreground">
                                            Qué hace
                                        </Label>
                                        <p className="mt-2 text-muted-foreground leading-relaxed">
                                            {row.does}
                                        </p>
                                    </div>
                                    {/* The gap is the argument, so it gets the
                                        accent rule and the brighter ink. */}
                                    <div className="border-brand-chord/60 border-t pt-3">
                                        <Label className="text-brand-chord">
                                            Dónde se corta
                                        </Label>
                                        <p className="mt-2 text-foreground leading-relaxed">
                                            {row.lacks}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </GsapReveal>

                {/* The answer to all three, set apart on purpose. */}
                <div className="lumen-card relative mt-[var(--space-lg)] overflow-hidden border-primary/40 p-[var(--space-lg)] md:p-[var(--space-2xl)]">
                    <BrandShader variant="panel" />
                    <div className="relative grid gap-[var(--space-lg)] md:grid-cols-[16rem_minmax(0,1fr)]">
                        <div>
                            <Label className="text-primary">Continuum</Label>
                            <p className="mt-3 font-display text-3xl text-foreground leading-tight">
                                El grafo
                            </p>
                        </div>
                        <p className="max-w-[52ch] text-foreground text-lg leading-relaxed">
                            Guarda la relación entre la persona, la decisión, el
                            documento y el criterio — y deja que preguntes sobre
                            ella. Eso es lo que ninguna de las tres de arriba
                            puede devolverte.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
