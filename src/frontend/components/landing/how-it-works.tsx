import type { LucideIcon } from "lucide-react";
import { Bot, Share2, Waypoints } from "lucide-react";
import { Reveal } from "./reveal";

type Pillar = {
    icon: LucideIcon;
    title: string;
    body: string;
};

const PILLARS: Pillar[] = [
    {
        icon: Waypoints,
        title: "Grafo de conocimiento",
        body: "Conecta personas, decisiones, procesos y contexto — no archivos sueltos.",
    },
    {
        icon: Bot,
        title: "Un agente por persona",
        body: "Cada agente modela el criterio y la experiencia de quien representa.",
    },
    {
        icon: Share2,
        title: "Transferencia de conocimiento",
        body: "El agente entiende y explica el trabajo, acelera el onboarding y sostiene la continuidad cuando alguien sale.",
    },
];

export function LandingHowItWorks() {
    return (
        <section
            id="como-funciona"
            className="scroll-mt-20 border-border/60 border-y bg-muted/30"
        >
            <div className="mx-auto max-w-5xl px-6 py-24">
                <Reveal>
                    <p className="font-medium text-primary text-sm">
                        Cómo funciona
                    </p>
                    <h2 className="mt-3 max-w-2xl text-balance font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
                        Modela cómo trabaja realmente cada persona.
                    </h2>
                    <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
                        No solo conecta documentos: captura cómo se toman las
                        decisiones y cómo se transmite el conocimiento.
                    </p>
                </Reveal>

                <div className="mt-14 grid gap-8 sm:grid-cols-3">
                    {PILLARS.map((pillar, i) => (
                        <Reveal key={pillar.title} delay={i * 0.08}>
                            <div className="h-full">
                                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                    <pillar.icon className="size-5" />
                                </span>
                                <h3 className="mt-5 font-medium text-foreground text-lg">
                                    {pillar.title}
                                </h3>
                                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                                    {pillar.body}
                                </p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
