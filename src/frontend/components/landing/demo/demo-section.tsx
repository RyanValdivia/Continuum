import { BrandShader } from "../brand-shader";
import { LandingHowItWorks } from "../how-it-works";
import { SectionHead } from "../lumen";
import { CeoGraph } from "./ceo-graph";

/**
 * The live apparatus — the same graph renderer the product ships at
 * `/[slug]/app/graph`, running on a curated sample.
 */
export function LandingDemo() {
    return (
        <section
            id="grafo"
            className="relative scroll-mt-24 overflow-clip border-border border-b"
        >
            <BrandShader variant="band" />
            <div className="relative shell pt-[clamp(3.5rem,8vw,6rem)] pb-[clamp(4rem,9vw,7rem)]">
                <SectionHead
                    kicker="El grafo"
                    title="Un puesto, y todo lo que sostiene."
                    lede="El grafo de una CEO: las decisiones que tomó, el criterio detrás, los documentos donde quedaron y el puesto abierto que tendrá que heredarlas. Es el mismo visor que usas dentro del producto."
                />

                {/* Full width on purpose: the detail panel is a fixed 320px, so
                    a side column would leave the canvas too cramped for the
                    force layout to separate its labels. */}
                <div className="mt-[var(--space-2xl)]">
                    <CeoGraph />
                </div>

                <LandingHowItWorks className="mt-[var(--space-2xl)]" />
            </div>
        </section>
    );
}
