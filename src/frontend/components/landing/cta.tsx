import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { Reveal } from "./reveal";

export function LandingCta() {
    return (
        <section className="mx-auto max-w-5xl px-6 py-24">
            <Reveal>
                <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 px-8 py-16 text-center">
                    <div
                        aria-hidden
                        className="-translate-x-1/2 pointer-events-none absolute top-[-6rem] left-1/2 size-[30rem] rounded-full bg-primary/10 blur-3xl"
                    />
                    <h2 className="relative text-balance font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
                        Menos búsqueda, más continuidad.
                    </h2>
                    <p className="relative mx-auto mt-4 max-w-md text-balance text-muted-foreground leading-relaxed">
                        Deja de perder el conocimiento de tu equipo. Empieza a
                        preservarlo.
                    </p>
                    <div className="relative mt-8">
                        <Button asChild size="lg">
                            <Link href="/auth/sign-in">
                                Empezar
                                <ArrowRight />
                            </Link>
                        </Button>
                    </div>
                </div>
            </Reveal>
        </section>
    );
}
