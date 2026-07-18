"use client";

import { ChevronRight, Database, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/frontend/lib/utils";
import type { NotionPageNode } from "../build-page-tree";

function NotionPageIcon({ node }: { node: NotionPageNode }) {
    if (node.iconEmoji) {
        return (
            <span className="text-sm leading-none" aria-hidden>
                {node.iconEmoji}
            </span>
        );
    }
    if (node.iconUrl) {
        return (
            // biome-ignore lint/performance/noImgElement: tiny external Notion-hosted icon, not worth next/image remote-pattern config
            <img
                src={node.iconUrl}
                alt=""
                className="size-4 shrink-0 rounded-sm object-cover"
            />
        );
    }
    const Icon = node.object === "database" ? Database : FileText;
    return <Icon className="size-4 shrink-0 text-muted-foreground" />;
}

function OpenInNotionLink({ url }: { url: string }) {
    return (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto shrink-0 text-muted-foreground opacity-0 hover:text-foreground group-hover/row:opacity-100"
            aria-label="Abrir en Notion"
        >
            <ExternalLink className="size-3.5" />
        </a>
    );
}

export function NotionPageTree({ nodes }: { nodes: NotionPageNode[] }) {
    return (
        <ul className="flex flex-col gap-0.5">
            {nodes.map((node) => (
                <NotionPageTreeItem key={node.id} node={node} />
            ))}
        </ul>
    );
}

function NotionPageTreeItem({ node }: { node: NotionPageNode }) {
    if (node.children.length === 0) {
        return (
            <li>
                <a
                    href={node.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group/row flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent"
                >
                    <NotionPageIcon node={node} />
                    <span className="truncate">{node.title}</span>
                    <ExternalLink className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover/row:opacity-100" />
                </a>
            </li>
        );
    }

    return (
        <li>
            <details open className="group/details">
                <summary
                    className={cn(
                        "group/row flex cursor-pointer list-none items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent",
                        "[&::-webkit-details-marker]:hidden",
                    )}
                >
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/details:rotate-90" />
                    <NotionPageIcon node={node} />
                    <span className="truncate">{node.title}</span>
                    <span className="text-muted-foreground text-xs">
                        {node.children.length}
                    </span>
                    <OpenInNotionLink url={node.url} />
                </summary>
                <div className="ml-2.5 border-l pl-3">
                    <NotionPageTree nodes={node.children} />
                </div>
            </details>
        </li>
    );
}
