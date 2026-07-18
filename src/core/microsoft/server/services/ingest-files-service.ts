import "server-only";
import { ServerConfig } from "@/config/server-config";
import { ingestDocumentService } from "@/core/knowledge/server/services/ingest-document-service";
import {
    classifyDriveItem,
    spExternalId,
    truncateContent,
} from "@/core/microsoft/domain/source-plan";
import type {
    IngestMicrosoftFiles,
    MicrosoftIngestResult,
} from "@/core/microsoft/domain/types";
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
    downloadDriveItemPdf,
    downloadDriveItemText,
    getDriveItem,
    MicrosoftUnauthorizedError,
} from "@/server/microsoft/graph-api";
import { extractPdfText } from "@/server/microsoft/pdf-text";
import { resolveMicrosoftAccessToken } from "./resolve-microsoft-access-token";

type IngestItem = MicrosoftIngestResult["items"][number];

function failedItem(
    externalId: string,
    title: string,
    error: string,
): IngestItem {
    return {
        externalId,
        title,
        ok: false,
        chunksCreated: 0,
        nodesCreated: 0,
        error,
    };
}

/**
 * Pull selected SharePoint/OneDrive files into the knowledge graph. Text
 * formats download directly; Office files go through Graph's server-side
 * PDF conversion + text extraction. One file's failure never aborts the
 * batch — it is reported per item.
 */
export async function ingestMicrosoftFilesService(
    organizationId: string,
    userId: string,
    input: IngestMicrosoftFiles,
): AsyncAppResult<MicrosoftIngestResult> {
    if (!ServerConfig.microsoft.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["microsoft"] }));
    }
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const token = await resolveMicrosoftAccessToken(organizationId);
        if (!token.ok) return err(token.error);
        const accessToken = token.data;

        const items: IngestItem[] = [];
        for (const { driveId, itemId } of input.items) {
            const externalId = spExternalId(driveId, itemId);
            try {
                const meta = await getDriveItem(accessToken, driveId, itemId);
                if (!meta) {
                    items.push(
                        failedItem(externalId, itemId, "Archivo no accesible"),
                    );
                    continue;
                }

                const kind = classifyDriveItem(meta.name, meta.mimeType);
                if (!kind) {
                    items.push(
                        failedItem(
                            externalId,
                            meta.name,
                            "Tipo de archivo no soportado",
                        ),
                    );
                    continue;
                }

                const raw =
                    kind === "text"
                        ? await downloadDriveItemText(
                              accessToken,
                              driveId,
                              itemId,
                          )
                        : await extractPdfText(
                              await downloadDriveItemPdf(
                                  accessToken,
                                  driveId,
                                  itemId,
                              ),
                          );
                const content = truncateContent(raw);
                if (!content.trim()) {
                    items.push(
                        failedItem(
                            externalId,
                            meta.name,
                            "Sin texto para ingestar",
                        ),
                    );
                    continue;
                }

                const result = await ingestDocumentService(organizationId, {
                    connector: "microsoft",
                    externalId,
                    title: meta.name,
                    content,
                    url: meta.webUrl ?? undefined,
                    extract: true,
                });
                if (!result.ok) {
                    items.push(
                        failedItem(externalId, meta.name, result.error.code),
                    );
                    continue;
                }
                items.push({
                    externalId,
                    title: meta.name,
                    ok: true,
                    chunksCreated: result.data.chunksCreated,
                    nodesCreated: result.data.nodesCreated,
                    error: null,
                });
            } catch (cause) {
                items.push(
                    failedItem(
                        externalId,
                        itemId,
                        cause instanceof Error ? cause.message : "unknown",
                    ),
                );
            }
        }

        const ingested = items.filter((i) => i.ok).length;
        return ok({ ingested, failed: items.length - ingested, items });
    } catch (cause) {
        if (cause instanceof MicrosoftUnauthorizedError) {
            return err(AppErrors.unauthorized(cause));
        }
        return err(AppErrors.unexpected(cause));
    }
}
