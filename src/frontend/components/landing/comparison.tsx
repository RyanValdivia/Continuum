import { Check } from "lucide-react";
import { Reveal } from "./reveal";

type Row = {
    category: string;
    tools: string;
    does: string;
    lacks: string;
};

const ROWS: Row[] = [
    {
        category: "Búsqueda empresarial",
        tools: "Glean, M365 Copilot",
        does: "Buscar información dispersa",
        lacks: "No preservan criterio ni experiencia",
    },
    {
        category: "Documentación",
        tools: "Guru, Notion, Confluence",
        does: "Centralizar documentos",
        lacks: "Documentan, no modelan cómo trabaja la persona",
    },
    {
        category: "Gestión de tareas",
        tools: "Asana, ClickUp",
        does: "Modelar tareas y flujos",
        lacks: "No capturan el conocimiento operativo",
    },
];

export function LandingComparison() {
    return (
        <section
            id="competencia"
            className="mx-auto max-w-5xl scroll-mt-20 px-6 py-24"
        >
            <Reveal>
                <p className="font-medium text-primary text-sm">Competencia</p>
                <h2 className="mt-3 max-w-2xl text-balance font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
                    Todos prometen acceso a la información. Nosotros,
                    continuidad.
                </h2>
            </Reveal>

            <Reveal delay={0.08}>
                <div className="mt-12 overflow-hidden rounded-xl border border-border/70">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-border/70 border-b bg-muted/40 text-muted-foreground">
                                    <th className="px-5 py-3 font-medium">
                                        Categoría
                                    </th>
                                    <th className="px-5 py-3 font-medium">
                                        Herramientas
                                    </th>
                                    <th className="px-5 py-3 font-medium">
                                        Qué hacen
                                    </th>
                                    <th className="px-5 py-3 font-medium">
                                        Qué les falta
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {ROWS.map((row) => (
                                    <tr
                                        key={row.category}
                                        className="border-border/60 border-b last:border-0"
                                    >
                                        <td className="px-5 py-4 font-medium text-foreground">
                                            {row.category}
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            {row.tools}
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            {row.does}
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            {row.lacks}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Reveal>

            <Reveal delay={0.12}>
                <div className="mt-5 flex items-start gap-4 rounded-xl border border-primary/25 bg-primary/5 p-6">
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Check className="size-4" />
                    </span>
                    <p className="text-foreground leading-relaxed">
                        <span className="font-semibold">Continuum</span> es la
                        única pensada para preservar y transferir el
                        conocimiento operativo de cada persona. Ahí está el
                        hueco que llena.
                    </p>
                </div>
            </Reveal>
        </section>
    );
}
