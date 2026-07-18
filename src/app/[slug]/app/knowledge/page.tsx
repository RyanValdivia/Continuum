import { KnowledgeChat } from "@/core/knowledge/client/ui/knowledge-chat";

/**
 * `/[slug]/app/knowledge` — chat with the org's knowledge agent. Auth + active
 * organization are enforced by the parent `[slug]/app` layout. When `?personId`
 * is present (deep-linked from a person's profile), the chat is scoped to that
 * person — "the agent of {name}".
 */
export default async function KnowledgePage({
    searchParams,
}: {
    searchParams: Promise<{ personId?: string; name?: string }>;
}) {
    const { personId, name } = await searchParams;
    return <KnowledgeChat personId={personId} personName={name} />;
}
