import { BrandShader } from "./brand-shader";
import { CtaButton } from "./cta-button";
import { Label } from "./lumen";

/** The closer. Names the first concrete step instead of restating the hero. */
export function LandingCta() {
    return (
        <section className="lumen-grid relative overflow-clip border-border border-b">
            <BrandShader variant="field" />
            <div className="relative shell grid justify-items-center gap-[var(--space-lg)] pt-[clamp(4rem,10vw,7rem)] pb-[clamp(4rem,10vw,7rem)] text-center">
                <span className="inline-flex items-center gap-2">
                    <span
                        aria-hidden
                        className="mark-pulse size-1.5 rounded-full bg-primary"
                    />
                    <Label className="text-muted-foreground">Empezar</Label>
                </span>

                <h2 className="max-w-[18ch] font-display text-[length:var(--text-display-s)] text-foreground leading-[1.05] tracking-[-0.025em]">
                    Empieza por un equipo. El grafo crece solo.
                </h2>
                <p className="max-w-[48ch] text-lg text-muted-foreground leading-relaxed">
                    Conecta una fuente y elige un equipo. Cada documento,
                    decisión y criterio que entra deja el grafo un poco más
                    completo que ayer.
                </p>

                <div className="mt-[var(--space-sm)]">
                    <CtaButton href="/auth/sign-in">Crear mi espacio</CtaButton>
                </div>
            </div>
        </section>
    );
}
