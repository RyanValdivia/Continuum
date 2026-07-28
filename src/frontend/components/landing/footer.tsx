import Link from "next/link";
import { ContinuumLogo } from "@/frontend/components/landing/logo";
import { Label } from "./lumen";

/**
 * Ft4 · Dense typographic colophon — mono, log-style. Closes the page as a
 * technical record rather than a sitemap.
 */
export function LandingFooter() {
    return (
        <footer className="shell grid gap-[var(--space-xl)] pt-[clamp(3rem,7vw,5rem)] pb-[var(--space-xl)]">
            <div className="flex items-center gap-2.5">
                <ContinuumLogo className="h-5 w-auto text-primary" />
                <span className="whitespace-nowrap font-display text-foreground text-xl leading-none">
                    Continuum
                </span>
            </div>

            <dl className="grid grid-cols-[minmax(0,1fr)] gap-x-[var(--space-2xl)] gap-y-[var(--space-lg)] border-border border-t pt-[var(--space-lg)] sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                <div className="flex flex-col gap-1.5">
                    <dt>
                        <Label className="text-muted-foreground">Qué es</Label>
                    </dt>
                    <dd className="text-muted-foreground text-sm leading-relaxed">
                        El grafo de conocimiento de la empresa: personas,
                        decisiones, documentos y criterio en una sola
                        estructura.
                    </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                    <dt>
                        <Label className="text-muted-foreground">Fuentes</Label>
                    </dt>
                    <dd className="text-muted-foreground text-sm leading-relaxed">
                        Notion · Slack · Microsoft 365 · Revisión de documentos
                    </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                    <dt>
                        <Label className="text-muted-foreground">Acceso</Label>
                    </dt>
                    <dd className="text-sm leading-relaxed">
                        <Link
                            href="/auth/sign-in"
                            className="whitespace-nowrap rounded-full text-foreground underline decoration-border underline-offset-4 outline-none transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:decoration-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4"
                        >
                            Entrar
                        </Link>
                    </dd>
                </div>
            </dl>

            <p className="border-border border-t pt-[var(--space-md)]">
                <Label className="text-muted-foreground">
                    © 2026 Continuum · Continuidad del conocimiento
                </Label>
            </p>
        </footer>
    );
}
