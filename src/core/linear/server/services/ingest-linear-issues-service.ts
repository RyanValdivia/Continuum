import "server-only";
import { ServerConfig } from "@/config/server-config";
import { ingestDocumentService } from "@/core/knowledge/server/services/ingest-document-service";
import type {
    IngestLinear,
    LinearIngestResult,
} from "@/core/linear/domain/types";
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
import { fetchLinearIssueDetails } from "@/server/linear/linear-api";
import { decryptSecret } from "@/server/security/token-cipher";
import { findLinearConnectionByOrg } from "../repository/find-linear-connection";

/**
 * Pull selected Linear issues into the knowledge graph. Admin-only
 * (owner/admin). One issue's failure never aborts the batch — it is
 * reported per item.
 */
export async function ingestLinearIssuesService(
    organizationId: string,
    userId: string,
    input: IngestLinear,
): AsyncAppResult<LinearIngestResult> {
    if (!ServerConfig.linear.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["linear"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const connection = await findLinearConnectionByOrg(organizationId);
        if (!connection)
            return err(AppErrors.notFound({ targets: ["linear"] }));

        const accessToken = decryptSecret(connection.accessToken);
        const details = await fetchLinearIssueDetails(
            accessToken,
            input.issueIds,
        );
        const detailById = new Map(details.map((d) => [d.id, d]));

        const items: LinearIngestResult["items"] = [];
        for (const issueId of input.issueIds) {
            const issue = detailById.get(issueId);
            if (!issue) {
                items.push({
                    issueId,
                    title: issueId,
                    ok: false,
                    chunksCreated: 0,
                    nodesCreated: 0,
                    error: "Issue no encontrada",
                });
                continue;
            }

            const content = [issue.title, issue.description ?? ""]
                .filter(Boolean)
                .join("\n\n");
            if (!content.trim()) {
                items.push({
                    issueId,
                    title: `${issue.identifier} — ${issue.title}`,
                    ok: false,
                    chunksCreated: 0,
                    nodesCreated: 0,
                    error: "Issue sin texto para ingestar",
                });
                continue;
            }

            const result = await ingestDocumentService(organizationId, {
                connector: "linear",
                externalId: issue.id,
                title: `${issue.identifier} — ${issue.title}`,
                content,
                url: issue.url,
                extract: true,
            });

            if (!result.ok) {
                items.push({
                    issueId,
                    title: `${issue.identifier} — ${issue.title}`,
                    ok: false,
                    chunksCreated: 0,
                    nodesCreated: 0,
                    error: result.error.code,
                });
                continue;
            }

            items.push({
                issueId,
                title: `${issue.identifier} — ${issue.title}`,
                ok: true,
                chunksCreated: result.data.chunksCreated,
                nodesCreated: result.data.nodesCreated,
                error: null,
            });
        }

        const ingested = items.filter((i) => i.ok).length;
        return ok({ ingested, failed: items.length - ingested, items });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
