import "server-only";
import type { EmbedFn } from "@/core/knowledge/server/embeddings/embed";
import { searchKnowledgeService } from "@/core/knowledge/server/services/search-knowledge-service";
import type {
    GeneratedRole,
    GenerateRoleInput,
} from "@/core/recruitment/domain/types";
import { assertOrgAdmin } from "@/server/auth/require-org-admin";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { type GenerateRoleFn, googleGenerateRole } from "../llm/generate-role";

export interface GenerateRoleDeps {
    generate?: GenerateRoleFn;
    embed?: EmbedFn;
}

/** Digest a person's captured knowledge into plain text for the drafting prompt. */
async function buildPersonDigest(
    organizationId: string,
    personId: string,
    title: string,
    deps: GenerateRoleDeps,
): Promise<string> {
    const search = await searchKnowledgeService(
        organizationId,
        { query: title, personId, limit: 12, hops: 1 },
        { embed: deps.embed },
    );
    if (!search.ok) return "";

    const nodes = search.data.nodes
        .map(
            (n) =>
                `- ${n.type}: ${n.label}${n.summary ? ` — ${n.summary}` : ""}`,
        )
        .join("\n");
    const chunks = search.data.chunks.map((c) => `- ${c.content}`).join("\n");
    return [
        nodes ? `Decisiones, procesos y conceptos:\n${nodes}` : "",
        chunks ? `\nExtractos:\n${chunks}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}

/**
 * Draft a role description with the AI. When `personId` is given, the draft is
 * grounded on that person's captured knowledge (the person being replaced);
 * otherwise it is drafted from the title alone. Retrieval failures degrade to
 * an empty digest — drafting is never blocked. Admin-only.
 */
export async function generateRoleDescriptionService(
    userId: string,
    organizationId: string,
    input: GenerateRoleInput,
    deps: GenerateRoleDeps = {},
): AsyncAppResult<GeneratedRole> {
    const generate = deps.generate ?? googleGenerateRole;

    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const digest = input.personId
            ? await buildPersonDigest(
                  organizationId,
                  input.personId,
                  input.title,
                  deps,
              )
            : "";
        const description = await generate({ title: input.title, digest });
        return ok({ description });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
