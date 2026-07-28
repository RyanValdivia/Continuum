import "server-only";
import { ServerConfig } from "@/config/server-config";
import { ingestDocumentService } from "@/core/knowledge/server/services/ingest-document-service";
import type {
    IngestPlane,
    PlaneIngestResult,
} from "@/core/plane/domain/types";
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
    fetchPlaneIssues,
    fetchPlaneProjects,
    PlaneUnauthorizedError,
} from "@/server/plane/plane-api";
import { decryptSecret } from "@/server/security/token-cipher";
import { findPlaneConnectionByOrg } from "../repository/find-plane-connection";

/**
 * Pull every issue from the selected projects into the knowledge graph.
 * Admin-only (owner/admin). One issue's failure never aborts the batch — it
 * is reported per item.
 */
export async function ingestPlaneService(
    organizationId: string,
    userId: string,
    input: IngestPlane,
): AsyncAppResult<PlaneIngestResult> {
    if (!ServerConfig.plane.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["plane"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const connection = await findPlaneConnectionByOrg(organizationId);
        if (!connection)
            return err(AppErrors.notFound({ targets: ["plane"] }));

        const apiKey = decryptSecret(connection.apiKey);
        const items: PlaneIngestResult["items"] = [];

        try {
            const projects = await fetchPlaneProjects(
                connection.baseUrl,
                connection.workspaceSlug,
                apiKey,
            );
            const projectById = new Map(projects.map((p) => [p.id, p]));

            for (const projectId of input.projectIds) {
                const project = projectById.get(projectId);
                if (!project) {
                    items.push({
                        issueId: projectId,
                        title: projectId,
                        ok: false,
                        chunksCreated: 0,
                        nodesCreated: 0,
                        error: "Proyecto no encontrado",
                    });
                    continue;
                }

                const issues = await fetchPlaneIssues(
                    connection.baseUrl,
                    connection.workspaceSlug,
                    project.id,
                    project.identifier,
                    apiKey,
                );

                for (const issue of issues) {
                    const content = [issue.name, issue.description ?? ""]
                        .filter(Boolean)
                        .join("\n\n");
                    const title = `${project.identifier}-${issue.sequenceId} — ${issue.name}`;
                    if (!content.trim()) {
                        items.push({
                            issueId: issue.id,
                            title,
                            ok: false,
                            chunksCreated: 0,
                            nodesCreated: 0,
                            error: "Issue sin texto para ingestar",
                        });
                        continue;
                    }

                    const result = await ingestDocumentService(organizationId, {
                        connector: "plane",
                        externalId: issue.id,
                        title,
                        content,
                        url: `${connection.baseUrl.replace(/\/$/, "")}/${connection.workspaceSlug}/projects/${project.id}/issues/${issue.id}`,
                        extract: true,
                    });

                    if (!result.ok) {
                        items.push({
                            issueId: issue.id,
                            title,
                            ok: false,
                            chunksCreated: 0,
                            nodesCreated: 0,
                            error: result.error.code,
                        });
                        continue;
                    }

                    items.push({
                        issueId: issue.id,
                        title,
                        ok: true,
                        chunksCreated: result.data.chunksCreated,
                        nodesCreated: result.data.nodesCreated,
                        error: null,
                    });
                }
            }
        } catch (cause) {
            if (cause instanceof PlaneUnauthorizedError) {
                return err(AppErrors.forbidden(cause));
            }
            throw cause;
        }

        const ingested = items.filter((i) => i.ok).length;
        return ok({ ingested, failed: items.length - ingested, items });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
