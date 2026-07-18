import { KnowledgeChat } from "@/core/knowledge/client/ui/knowledge-chat";

/**
 * `/[slug]/app/knowledge` — chat with the org's knowledge agent. Auth + active
 * organization are enforced by the parent `[slug]/app` layout.
 */
export default function KnowledgePage() {
    return <KnowledgeChat />;
}
