import type { NotionPage } from "@/core/notion/domain/types";

export type NotionPageNode = NotionPage & { children: NotionPageNode[] };

/**
 * Nests the flat search results by `parentId`. Sharing a page in Notion
 * grants the integration its whole subtree, so the API returns everything
 * under it flat — this rebuilds the hierarchy for display. A node is a root
 * when its parent wasn't itself returned (workspace-level item, or an
 * ancestor the user didn't share).
 */
export function buildNotionPageTree(items: NotionPage[]): NotionPageNode[] {
    const nodesById = new Map<string, NotionPageNode>(
        items.map((item) => [item.id, { ...item, children: [] }]),
    );

    const roots: NotionPageNode[] = [];
    for (const node of nodesById.values()) {
        const parent = node.parentId ? nodesById.get(node.parentId) : undefined;
        if (parent) parent.children.push(node);
        else roots.push(node);
    }
    return roots;
}
