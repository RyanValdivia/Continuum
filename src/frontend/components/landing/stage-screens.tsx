import type { PropsWithChildren, ReactNode } from "react";
import { Label } from "./lumen";

export function StageScreen({ index }: { index: number }) {
    switch (index) {
        case 0:
            return <SourcesScreen />;
        case 1:
            return <GraphScreen />;
        case 2:
            return <AgentScreen />;
        default:
            return <FreshnessScreen />;
    }
}

function StageFrame({
    caption,
    children,
}: PropsWithChildren<{ caption: ReactNode }>) {
    return (
        <figure className="relative min-h-[20rem] overflow-hidden rounded-[var(--radius-card)] border border-border bg-card/90 p-[var(--space-lg)] lg:min-h-[28rem]">
            <figcaption className="sr-only">{caption}</figcaption>
            <div className="relative z-10">{children}</div>
        </figure>
    );
}

function SourcesScreen() {
    const sources = ["Notion", "Slack", "Microsoft 365", "Documentos"];

    return (
        <StageFrame caption="Cuatro fuentes convergen en Continuum.">
            <Label className="text-primary">Conectar · fuentes</Label>
            <div className="mt-[var(--space-lg)] grid gap-[var(--space-md)] lg:grid-cols-[minmax(0,1fr)_9rem] lg:items-center">
                <ul className="grid gap-3" aria-label="Fuentes conectadas">
                    {sources.map((source) => (
                        <li
                            key={source}
                            className="flex items-center gap-3 text-foreground"
                        >
                            <span className="grid min-h-10 min-w-32 place-items-center rounded-[var(--radius-card)] border border-border bg-secondary px-3 text-sm">
                                {source}
                            </span>
                            <span
                                aria-hidden
                                className="h-px flex-1 bg-primary"
                            />
                        </li>
                    ))}
                </ul>
                <div className="grid size-36 justify-self-center place-items-center rounded-full border border-border bg-primary p-6 text-center text-primary-foreground">
                    <Label className="text-primary-foreground">Continuum</Label>
                </div>
            </div>
        </StageFrame>
    );
}

function GraphScreen() {
    const nodes = ["Persona", "Decisión", "Documento", "Criterio"];

    return (
        <StageFrame caption="Un grafo relaciona persona, decisión, documento y criterio.">
            <Label className="text-brand-chord">Mapear · relaciones</Label>
            <div className="relative mt-[var(--space-lg)] grid min-h-64 place-items-center">
                <svg
                    aria-hidden
                    className="absolute inset-0 size-full text-muted-foreground"
                    viewBox="0 0 400 260"
                >
                    <title>Relaciones entre nodos del grafo</title>
                    <line
                        x1="72"
                        y1="52"
                        x2="200"
                        y2="130"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                    <line
                        x1="328"
                        y1="52"
                        x2="200"
                        y2="130"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                    <line
                        x1="72"
                        y1="208"
                        x2="200"
                        y2="130"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                    <line
                        x1="328"
                        y1="208"
                        x2="200"
                        y2="130"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                </svg>
                <div className="relative grid w-full grid-cols-2 gap-x-8 gap-y-20 text-center text-sm">
                    {nodes.map((node) => (
                        <span
                            key={node}
                            className="justify-self-center rounded-full border border-border bg-secondary px-3 py-2 text-foreground"
                        >
                            {node}
                        </span>
                    ))}
                </div>
                <span className="absolute rounded-full border border-border bg-primary px-4 py-3 text-primary-foreground text-sm">
                    Grafo
                </span>
            </div>
        </StageFrame>
    );
}

function AgentScreen() {
    return (
        <StageFrame caption="Un agente de Head of Sales responde con sus fuentes.">
            <Label className="text-primary">Consultar · agente</Label>
            <div className="mt-[var(--space-lg)] grid gap-[var(--space-lg)]">
                <div className="rounded-[var(--radius-card)] border border-border bg-secondary p-[var(--space-md)]">
                    <Label className="text-muted-foreground">
                        Head of Sales
                    </Label>
                    <p className="mt-2 text-foreground leading-relaxed">
                        «¿Puedo cerrar este deal con 20 % de descuento?»
                    </p>
                </div>
                <div className="rounded-[var(--radius-card)] border border-border bg-card p-[var(--space-md)]">
                    <Label className="text-primary">Respuesta</Label>
                    <p className="mt-2 text-foreground leading-relaxed">
                        No sin aprobación — el tope sin escalar es 15 %.
                    </p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Fuentes</Label>
                    <ul className="mt-2 grid gap-2 text-muted-foreground text-sm">
                        <li className="rounded-[var(--radius-card)] border border-border bg-secondary px-3 py-2">
                            Política comercial · Notion
                        </li>
                        <li className="rounded-[var(--radius-card)] border border-border bg-secondary px-3 py-2">
                            Aprobaciones de descuento · Slack
                        </li>
                    </ul>
                </div>
            </div>
        </StageFrame>
    );
}

function FreshnessScreen() {
    const sources = ["Slack", "Notion", "Microsoft 365"];

    return (
        <StageFrame caption="Las fuentes sincronizadas mantienen el grafo al día.">
            <Label className="text-brand-chord">Mantener · sync continuo</Label>
            <ul
                className="mt-[var(--space-lg)] grid gap-3"
                aria-label="Estado de sincronización"
            >
                {sources.map((source) => (
                    <li
                        key={source}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-secondary px-4 py-3"
                    >
                        <span className="text-foreground">{source}</span>
                        <Label className="text-primary">Actualizado</Label>
                    </li>
                ))}
            </ul>
            <div className="mt-[var(--space-lg)] flex items-center justify-between rounded-[var(--radius-card)] border border-border bg-primary p-[var(--space-md)] text-primary-foreground">
                <span>Grafo al día</span>
                <span aria-hidden className="size-3 rounded-full bg-card" />
            </div>
        </StageFrame>
    );
}
