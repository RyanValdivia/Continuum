import type { GraphCluster } from "./stage-screen-data";

export type SourceMark =
    | "notion"
    | "slack"
    | "microsoft-365"
    | "documents"
    | "teams"
    | "onedrive"
    | "sharepoint"
    | "word"
    | "excel"
    | "powerpoint"
    | "pdf"
    | "note"
    | "decision-log"
    | "agreement";

export type SourceVisual = {
    id: string;
    label: string;
    kind: "provider" | "artifact";
    mark: SourceMark;
    cluster: GraphCluster;
    x: number;
    y: number;
    depth: number;
    rotation: number;
};

export const LANDING_SOURCES: readonly SourceVisual[] = [
    {
        id: "notion",
        label: "Notion",
        kind: "provider",
        mark: "notion",
        cluster: "document",
        x: 8,
        y: 24,
        depth: 1,
        rotation: -8,
    },
    {
        id: "slack",
        label: "Slack",
        kind: "provider",
        mark: "slack",
        cluster: "document",
        x: 12,
        y: 68,
        depth: 2,
        rotation: 6,
    },
    {
        id: "microsoft-365",
        label: "Microsoft 365",
        kind: "provider",
        mark: "microsoft-365",
        cluster: "document",
        x: 49,
        y: 4,
        depth: 3,
        rotation: -4,
    },
    {
        id: "documents",
        label: "Documentos",
        kind: "provider",
        mark: "documents",
        cluster: "document",
        x: 90,
        y: 20,
        depth: 1,
        rotation: 7,
    },
    {
        id: "teams-thread",
        label: "Conversación de Teams",
        kind: "artifact",
        mark: "teams",
        cluster: "document",
        x: 94,
        y: 61,
        depth: 2,
        rotation: -6,
    },
    {
        id: "onedrive-file",
        label: "Archivo de OneDrive",
        kind: "artifact",
        mark: "onedrive",
        cluster: "document",
        x: 64,
        y: 92,
        depth: 3,
        rotation: 5,
    },
    {
        id: "sharepoint-page",
        label: "Página de SharePoint",
        kind: "artifact",
        mark: "sharepoint",
        cluster: "document",
        x: 18,
        y: 89,
        depth: 1,
        rotation: -5,
    },
    {
        id: "word-brief",
        label: "Brief de Word",
        kind: "artifact",
        mark: "word",
        cluster: "document",
        x: 2,
        y: 48,
        depth: 2,
        rotation: 8,
    },
    {
        id: "excel-model",
        label: "Modelo de Excel",
        kind: "artifact",
        mark: "excel",
        cluster: "criterion",
        x: 75,
        y: 8,
        depth: 1,
        rotation: -7,
    },
    {
        id: "powerpoint-deck",
        label: "Deck de PowerPoint",
        kind: "artifact",
        mark: "powerpoint",
        cluster: "decision",
        x: 84,
        y: 83,
        depth: 3,
        rotation: 4,
    },
    {
        id: "pdf-policy",
        label: "Política PDF",
        kind: "artifact",
        mark: "pdf",
        cluster: "criterion",
        x: 33,
        y: 10,
        depth: 2,
        rotation: 7,
    },
    {
        id: "meeting-note",
        label: "Nota de reunión",
        kind: "artifact",
        mark: "note",
        cluster: "person",
        x: 28,
        y: 78,
        depth: 1,
        rotation: -4,
    },
    {
        id: "decision-log",
        label: "Registro de decisión",
        kind: "artifact",
        mark: "decision-log",
        cluster: "decision",
        x: 69,
        y: 34,
        depth: 2,
        rotation: 5,
    },
    {
        id: "project-agreement",
        label: "Acuerdo de proyecto",
        kind: "artifact",
        mark: "agreement",
        cluster: "decision",
        x: 38,
        y: 94,
        depth: 3,
        rotation: -6,
    },
];
