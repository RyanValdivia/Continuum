import {
    BadgeCheck,
    Cloud,
    FileText,
    Handshake,
    NotebookPen,
    PanelsTopLeft,
    Presentation,
    Sheet,
    Users,
} from "lucide-react";
import type { ReactElement } from "react";
import type {
    GraphCluster,
    SourceMark,
    SourceVisual,
} from "./stage-screen-data";

const CLUSTER_MARK_CLASSES: Record<GraphCluster, string> = {
    person: "bg-primary/15 text-primary",
    decision: "bg-brand-chord/15 text-brand-chord",
    document: "bg-secondary text-primary",
    criterion: "bg-secondary text-brand-chord",
};

function MicrosoftMark(): ReactElement {
    return (
        <svg viewBox="0 0 20 20" aria-hidden className="size-5">
            <title>Microsoft</title>
            <path
                d="M1 1h8v8H1zM11 1h8v8h-8zM1 11h8v8H1zM11 11h8v8h-8z"
                fill="currentColor"
            />
        </svg>
    );
}

function SlackMark(): ReactElement {
    return (
        <svg viewBox="0 0 20 20" aria-hidden className="size-5">
            <title>Slack</title>
            <path
                d="M8 1a2 2 0 0 1 2 2v5H8a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2Zm4 5h5a2 2 0 1 1 0 4h-5V6Zm0 6h2a2 2 0 0 1 2 2v3a2 2 0 1 1-4 0v-5Zm-9-2h5v4H3a2 2 0 1 1 0-4Z"
                fill="currentColor"
            />
        </svg>
    );
}

function Mark({ mark }: { mark: SourceMark }): ReactElement {
    switch (mark) {
        case "notion":
            return <span className="font-serif text-lg font-bold">N</span>;
        case "slack":
            return <SlackMark />;
        case "microsoft-365":
            return <MicrosoftMark />;
        case "teams":
            return <Users className="size-5" />;
        case "onedrive":
            return <Cloud className="size-5" />;
        case "sharepoint":
            return <PanelsTopLeft className="size-5" />;
        case "excel":
            return <Sheet className="size-5" />;
        case "powerpoint":
            return <Presentation className="size-5" />;
        case "note":
            return <NotebookPen className="size-5" />;
        case "decision-log":
            return <BadgeCheck className="size-5" />;
        case "agreement":
            return <Handshake className="size-5" />;
        case "documents":
        case "word":
        case "pdf":
            return <FileText className="size-5" />;
    }
}

export function StageSourceMark({
    source,
}: {
    source: SourceVisual;
}): ReactElement {
    return (
        <div
            data-source-mark={source.id}
            data-source-depth={source.depth}
            data-source-cluster={source.cluster}
            className="absolute flex items-center gap-2 rounded-[var(--radius-card)] border border-border bg-card/85 px-3 py-2 text-foreground shadow-lg backdrop-blur-sm"
            style={{
                left: `${source.x}%`,
                top: `${source.y}%`,
                transform: `translate(-50%, -50%) rotate(${source.rotation}deg)`,
            }}
        >
            <span
                className={`grid size-8 place-items-center rounded-lg ${CLUSTER_MARK_CLASSES[source.cluster]}`}
            >
                <Mark mark={source.mark} />
            </span>
            <span className="max-w-24 text-[0.65rem] leading-tight">
                {source.label}
            </span>
        </div>
    );
}
