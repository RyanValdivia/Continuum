import { Reveal } from "../reveal";
import { DemoExperience } from "./demo-experience";

export function LandingDemo() {
    return (
        <section
            id="demo"
            className="mx-auto max-w-5xl scroll-mt-20 px-6 py-24"
        >
            <Reveal>
                <p className="font-medium text-primary text-sm">Demo</p>
                <h2 className="mt-3 max-w-2xl text-balance font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
                    El conocimiento de cada persona, vivo.
                </h2>
                <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
                    Cada puesto tiene su agente: sus documentos, decisiones y
                    criterios. Pásate por encima para explorarlo — y haz clic
                    para ver el roadmap que Continuum genera para ocupar ese
                    puesto.
                </p>
            </Reveal>

            <Reveal delay={0.1}>
                <div className="mt-10">
                    <DemoExperience />
                </div>
            </Reveal>
        </section>
    );
}
