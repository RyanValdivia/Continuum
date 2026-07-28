import { cn } from "@/frontend/lib/utils";
import { Label } from "./lumen";

type Annotation = {
    tag: string;
    title: string;
    body: string;
};

const PILLARS: Annotation[] = [
    {
        tag: "Estructura",
        title: "Relaciones, no archivos",
        body: "Cada nodo sabe con qué se conecta. Eso es lo que un buscador no puede devolverte.",
    },
    {
        tag: "Cobertura",
        title: "Un agente por persona",
        body: "Cada puesto tiene un agente que responde con el criterio de quien lo ocupa.",
    },
    {
        tag: "Trazabilidad",
        title: "Toda respuesta tiene origen",
        body: "Cada respuesta apunta al nodo del que salió: la decisión, el documento o el criterio.",
    },
];

/**
 * F5 · Annotated — margin labels for the graph above. Hairline rules only, no
 * icons and no tiles: these read as annotations on the apparatus, not as a
 * third feature grid.
 */
export function LandingHowItWorks({ className }: { className?: string }) {
    return (
        <aside
            id="como-funciona"
            aria-label="Cómo funciona"
            className={cn("scroll-mt-24", className)}
        >
            <dl className="grid grid-cols-[minmax(0,1fr)] gap-[var(--space-lg)] sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                {PILLARS.map((pillar) => (
                    <div
                        key={pillar.title}
                        className="border-border border-t pt-[var(--space-md)]"
                    >
                        <Label className="text-muted-foreground">
                            {pillar.tag}
                        </Label>
                        <dt className="mt-2 font-display text-foreground text-xl leading-tight">
                            {pillar.title}
                        </dt>
                        <dd className="mt-2 text-muted-foreground text-sm leading-relaxed">
                            {pillar.body}
                        </dd>
                    </div>
                ))}
            </dl>
        </aside>
    );
}
