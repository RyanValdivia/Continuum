import type { Node } from "@xyflow/react";

/** Visual state a node/edge takes as the user explores the graph. */
export type GraphState = "default" | "active" | "dim";

/** Kind of knowledge a person's agent holds. */
export type KnowledgeTipo = "documento" | "decision" | "criterio";

export const TIPO_LABEL: Record<KnowledgeTipo, string> = {
    documento: "Documento",
    decision: "Decisión",
    criterio: "Criterio",
};

export type KnowledgeItem = { tipo: KnowledgeTipo; label: string };

export type RoadmapRow = {
    etapa: string;
    foco: string;
    base: string;
    resultado: string;
};

export type PuestoId = "sales" | "pm" | "data" | "mkt";

export type PuestoDef = {
    label: string;
    initial: string;
    knowledge: KnowledgeItem[];
    roadmap: RoadmapRow[];
};

/** Curated, invented knowledge + onboarding roadmap for each puesto. */
export const PUESTOS: Record<PuestoId, PuestoDef> = {
    sales: {
        label: "Head of Sales",
        initial: "HS",
        knowledge: [
            { tipo: "documento", label: "Playbook de Ventas 2026" },
            { tipo: "documento", label: "Forecast Q3 · Pipeline" },
            { tipo: "decision", label: "Descuento máx. 15% sin aprobar" },
            { tipo: "decision", label: "Priorizar deals > $50k" },
            { tipo: "criterio", label: "Enterprise antes que SMB" },
        ],
        roadmap: [
            {
                etapa: "Semana 1",
                foco: "Pipeline y etapas del CRM",
                base: "Playbook de Ventas 2026",
                resultado: "Gestiona el pipeline solo",
            },
            {
                etapa: "Semana 2",
                foco: "Política de descuentos y aprobaciones",
                base: "Decisión: descuento máx. 15%",
                resultado: "Cierra sin escalar de más",
            },
            {
                etapa: "Semana 3",
                foco: "Forecast y cuentas clave",
                base: "Forecast Q3 · Pipeline",
                resultado: "Predice el trimestre",
            },
            {
                etapa: "Semana 4",
                foco: "Criterio de priorización",
                base: "Criterio: enterprise > SMB",
                resultado: "Enfoca el esfuerzo correcto",
            },
        ],
    },
    pm: {
        label: "Product Manager",
        initial: "PM",
        knowledge: [
            { tipo: "documento", label: "PRD · Roadmap 2026" },
            { tipo: "documento", label: "Notas de Discovery" },
            { tipo: "decision", label: "Release mensual fijo" },
            { tipo: "decision", label: "No construir Feature X" },
            { tipo: "criterio", label: "Impacto sobre esfuerzo" },
        ],
        roadmap: [
            {
                etapa: "Semana 1",
                foco: "Roadmap y visión de producto",
                base: "PRD · Roadmap 2026",
                resultado: "Explica el porqué",
            },
            {
                etapa: "Semana 2",
                foco: "Proceso de discovery",
                base: "Notas de Discovery",
                resultado: "Valida ideas con datos",
            },
            {
                etapa: "Semana 3",
                foco: "Ciclo de release",
                base: "Decisión: release mensual",
                resultado: "Planifica entregas",
            },
            {
                etapa: "Semana 4",
                foco: "Priorización",
                base: "Criterio: impacto / esfuerzo",
                resultado: "Dice no con criterio",
            },
        ],
    },
    data: {
        label: "Data Analyst",
        initial: "DA",
        knowledge: [
            { tipo: "documento", label: "Diccionario de Datos" },
            { tipo: "documento", label: "Modelo de Atribución" },
            { tipo: "decision", label: "Fuente de verdad = Warehouse" },
            { tipo: "decision", label: "Deprecar métrica de vanidad Y" },
            { tipo: "criterio", label: "Reproducibilidad ante todo" },
        ],
        roadmap: [
            {
                etapa: "Semana 1",
                foco: "Modelo de datos y warehouse",
                base: "Diccionario de Datos",
                resultado: "Consulta sin ayuda",
            },
            {
                etapa: "Semana 2",
                foco: "Métricas y atribución",
                base: "Modelo de Atribución",
                resultado: "Explica cada KPI",
            },
            {
                etapa: "Semana 3",
                foco: "Fuentes de verdad",
                base: "Decisión: warehouse",
                resultado: "Evita datos duplicados",
            },
            {
                etapa: "Semana 4",
                foco: "Validación y reproducibilidad",
                base: "Criterio: reproducibilidad",
                resultado: "Reportes confiables",
            },
        ],
    },
    mkt: {
        label: "Marketing Lead",
        initial: "ML",
        knowledge: [
            { tipo: "documento", label: "Calendario Editorial" },
            { tipo: "documento", label: "Brand Guidelines" },
            { tipo: "decision", label: "60% performance / 40% brand" },
            { tipo: "decision", label: "Pausar canal Z (CAC alto)" },
            { tipo: "criterio", label: "CAC por canal" },
        ],
        roadmap: [
            {
                etapa: "Semana 1",
                foco: "Marca y tono",
                base: "Brand Guidelines",
                resultado: "Mantiene consistencia",
            },
            {
                etapa: "Semana 2",
                foco: "Calendario y canales",
                base: "Calendario Editorial",
                resultado: "Planifica campañas",
            },
            {
                etapa: "Semana 3",
                foco: "Mix de presupuesto",
                base: "Decisión: 60 / 40",
                resultado: "Asigna con criterio",
            },
            {
                etapa: "Semana 4",
                foco: "Eficiencia por canal",
                base: "Criterio: CAC por canal",
                resultado: "Optimiza el gasto",
            },
        ],
    },
};

export const PUESTO_IDS = Object.keys(PUESTOS) as PuestoId[];

export type PuestoNodeData = {
    kind: "puesto";
    puesto: PuestoId;
    label: string;
    initial: string;
    state: GraphState;
};
export type KnowledgeNodeData = {
    kind: "knowledge";
    tipo: KnowledgeTipo;
    label: string;
    state: GraphState;
};
export type HubNodeData = { kind: "hub"; state: GraphState };
export type GraphNodeData = PuestoNodeData | KnowledgeNodeData | HubNodeData;

/** Fixed scatter for the (reused) knowledge nodes of the active puesto. */
const KNOWLEDGE_SLOTS = [
    { x: 470, y: 10 },
    { x: 650, y: 95 },
    { x: 500, y: 180 },
    { x: 660, y: 265 },
    { x: 470, y: 350 },
];

export const KNOWLEDGE_SLOT_COUNT = KNOWLEDGE_SLOTS.length;

export function knowledgeNodeId(index: number): string {
    return `knowledge-${index}`;
}

export const INITIAL_NODES: Node<GraphNodeData>[] = [
    {
        id: "hub",
        type: "hub",
        position: { x: 250, y: 170 },
        data: { kind: "hub", state: "default" },
    },
    ...PUESTO_IDS.map((id, i) => ({
        id,
        type: "puesto" as const,
        position: { x: 0, y: i * 120 + 10 },
        data: {
            kind: "puesto" as const,
            puesto: id,
            label: PUESTOS[id].label,
            initial: PUESTOS[id].initial,
            state: "default" as GraphState,
        },
    })),
    ...KNOWLEDGE_SLOTS.map((slot, i) => ({
        id: knowledgeNodeId(i),
        type: "knowledge" as const,
        position: slot,
        hidden: true,
        data: {
            kind: "knowledge" as const,
            tipo: "documento" as KnowledgeTipo,
            label: "",
            state: "active" as GraphState,
        },
    })),
];
