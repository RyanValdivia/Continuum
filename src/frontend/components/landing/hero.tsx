import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { Reveal } from "./reveal";

export function LandingHero() {
    return (
        <section className="relative overflow-hidden">
            {/* Soft blue glow */}
            <div
                aria-hidden
                className="-translate-x-1/2 pointer-events-none absolute top-[-8rem] left-1/2 size-[42rem] rounded-full bg-primary/10 blur-3xl"
            />
            {/* Knowledge-graph node motif */}
            <GraphMotif />

            <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-20 text-center sm:pt-32">
                <Reveal>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-muted-foreground text-xs backdrop-blur-sm">
                        <span className="size-1.5 rounded-full bg-primary" />
                        Plataforma de continuidad del conocimiento
                    </span>
                </Reveal>

                <Reveal delay={0.05}>
                    <h1 className="mt-6 text-balance font-semibold text-4xl text-foreground leading-[1.05] tracking-tight sm:text-6xl">
                        La memoria viva de la empresa.
                    </h1>
                </Reveal>

                <Reveal delay={0.1}>
                    <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground leading-relaxed">
                        No es otro chatbot. Continuum preserva el criterio y la
                        experiencia de cada persona — no solo sus documentos.
                    </p>
                </Reveal>

                <Reveal delay={0.15}>
                    <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Button asChild size="lg">
                            <Link href="/auth/sign-in">
                                Empezar
                                <ArrowRight />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="ghost">
                            <a href="#como-funciona">Ver cómo funciona</a>
                        </Button>
                    </div>
                </Reveal>

                <Reveal delay={0.2}>
                    <p className="mt-10 font-medium text-muted-foreground text-sm">
                        Menos búsqueda,{" "}
                        <span className="text-foreground">
                            más continuidad.
                        </span>
                    </p>
                </Reveal>
            </div>
        </section>
    );
}

function GraphMotif() {
    return (
        <svg
            aria-hidden
            className="-z-10 -translate-x-1/2 absolute top-10 left-1/2 h-[26rem] w-[52rem] text-primary/25"
            viewBox="0 0 520 260"
            fill="none"
        >
            <title>Knowledge graph</title>
            <g stroke="currentColor" strokeWidth="1">
                <line x1="90" y1="70" x2="200" y2="130" />
                <line x1="200" y1="130" x2="330" y2="60" />
                <line x1="200" y1="130" x2="300" y2="200" />
                <line x1="330" y1="60" x2="440" y2="120" />
                <line x1="300" y1="200" x2="440" y2="120" />
                <line x1="90" y1="70" x2="150" y2="20" />
            </g>
            <g fill="currentColor">
                <circle cx="90" cy="70" r="4" />
                <circle cx="200" cy="130" r="6" />
                <circle cx="330" cy="60" r="4" />
                <circle cx="300" cy="200" r="4" />
                <circle cx="440" cy="120" r="5" />
                <circle cx="150" cy="20" r="3" />
            </g>
        </svg>
    );
}
