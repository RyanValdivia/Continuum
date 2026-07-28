import "server-only";
import { ServerConfig } from "@/config/server-config";
import { ingestDocumentService } from "@/core/knowledge/server/services/ingest-document-service";
import type {
    GithubIngestResult,
    IngestGithub,
} from "@/core/github/domain/types";
import {
    getOrgMembership,
    ORG_ADMIN_ROLES,
} from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    fetchGithubIssues,
    fetchGithubReadme,
    GithubUnauthorizedError,
} from "@/server/github/github-api";
import { decryptSecret } from "@/server/security/token-cipher";
import { findGithubConnectionByOrg } from "../repository/find-github-connection";

/**
 * Pull selected repos into the knowledge graph. Admin-only (owner/admin).
 * Per repo: README as one document, each open issue as another. One repo's
 * failure never aborts the batch — it is reported per item.
 */
export async function ingestGithubReposService(
    organizationId: string,
    userId: string,
    input: IngestGithub,
): AsyncAppResult<GithubIngestResult> {
    if (!ServerConfig.github.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["github"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const connection = await findGithubConnectionByOrg(organizationId);
        if (!connection)
            return err(AppErrors.notFound({ targets: ["github"] }));

        const accessToken = decryptSecret(connection.accessToken);
        const items: GithubIngestResult["items"] = [];

        for (const fullName of input.repos) {
            const [owner, repo] = fullName.split("/");
            if (!owner || !repo) {
                items.push({
                    repo: fullName,
                    title: fullName,
                    ok: false,
                    chunksCreated: 0,
                    nodesCreated: 0,
                    error: "Formato inválido, esperado owner/repo",
                });
                continue;
            }

            try {
                const readme = await fetchGithubReadme(accessToken, owner, repo);
                if (readme) {
                    const result = await ingestDocumentService(organizationId, {
                        connector: "github",
                        externalId: `${fullName}#readme`,
                        title: `${fullName} — README`,
                        content: readme,
                        url: `https://github.com/${fullName}#readme`,
                        extract: true,
                    });
                    items.push(
                        toItem(fullName, `${fullName} — README`, result),
                    );
                }

                const issues = await fetchGithubIssues(accessToken, owner, repo);
                for (const issue of issues) {
                    const content = [issue.title, issue.body ?? ""]
                        .filter(Boolean)
                        .join("\n\n");
                    if (!content.trim()) continue;

                    const result = await ingestDocumentService(organizationId, {
                        connector: "github",
                        externalId: `${fullName}#issue-${issue.number}`,
                        title: `${fullName} #${issue.number} — ${issue.title}`,
                        content,
                        url: issue.url,
                        extract: true,
                    });
                    items.push(
                        toItem(
                            fullName,
                            `${fullName} #${issue.number}`,
                            result,
                        ),
                    );
                }
            } catch (cause) {
                if (cause instanceof GithubUnauthorizedError) {
                    items.push({
                        repo: fullName,
                        title: fullName,
                        ok: false,
                        chunksCreated: 0,
                        nodesCreated: 0,
                        error: "Token de GitHub inválido — reconectá la integración",
                    });
                    continue;
                }
                items.push({
                    repo: fullName,
                    title: fullName,
                    ok: false,
                    chunksCreated: 0,
                    nodesCreated: 0,
                    error: cause instanceof Error ? cause.message : "unknown",
                });
            }
        }

        const ingested = items.filter((i) => i.ok).length;
        return ok({ ingested, failed: items.length - ingested, items });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}

function toItem(
    repo: string,
    title: string,
    result: Awaited<ReturnType<typeof ingestDocumentService>>,
): GithubIngestResult["items"][number] {
    if (!result.ok) {
        return {
            repo,
            title,
            ok: false,
            chunksCreated: 0,
            nodesCreated: 0,
            error: result.error.code,
        };
    }
    return {
        repo,
        title,
        ok: true,
        chunksCreated: result.data.chunksCreated,
        nodesCreated: result.data.nodesCreated,
        error: null,
    };
}
