import type { LucideIcon } from "lucide-react";
import { Clock, Network, Wallet } from "lucide-react";
import { Reveal } from "./reveal";

type Cost = {
    icon: LucideIcon;
    title: string;
    body: string;
};

const COSTS: Cost[] = [
    {
        icon: Clock,
        title: "Lento",
        body: "El nuevo tarda meses en entender cómo se hacían las cosas.",
    },
    {
        icon: Wallet,
        title: "Costoso",
        body: "Se pierde productividad y se repiten errores ya resueltos.",
    },
    {
        icon: Network,
        title: "Dependiente de otros",
        body: "El conocimiento queda en la cabeza de los que quedan.",
    },
];

export function LandingProblem() {
    return (
        <section
            id="problema"
            className="mx-auto max-w-5xl scroll-mt-20 px-6 py-24"
        >
            <Reveal>
                <p className="font-medium text-primary text-sm">El problema</p>
                <h2 className="mt-3 max-w-2xl text-balance font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
                    Cuando alguien clave se va, su conocimiento se va con esa
                    persona.
                </h2>
                <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
                    Por más documentos que tengas, no se captura el contexto, el
                    criterio ni la experiencia.
                </p>
            </Reveal>

            <div className="mt-14 grid gap-5 sm:grid-cols-3">
                {COSTS.map((cost, i) => (
                    <Reveal key={cost.title} delay={i * 0.08}>
                        <div className="h-full rounded-xl border border-border/70 bg-card p-6">
                            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <cost.icon className="size-5" />
                            </span>
                            <h3 className="mt-4 font-medium text-foreground text-lg">
                                {cost.title}
                            </h3>
                            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                                {cost.body}
                            </p>
                        </div>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}
