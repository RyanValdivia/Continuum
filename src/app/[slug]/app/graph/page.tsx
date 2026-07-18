import { KnowledgeGraphExplorer } from "@/core/knowledge/client/ui/knowledge-graph-explorer";

/**
 * `/[slug]/app/graph` — force-directed view of the org's knowledge graph.
 * Auth + active organization are enforced by the parent `[slug]/app` layout.
 */
export default function GraphPage() {
    return <KnowledgeGraphExplorer />;
}
