import "server-only";
import type { DocumentDetail } from "@/core/document-review/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findDocumentById } from "../repository/find-document-by-id";
import { findDocumentChunks } from "../repository/find-document-chunks";
import { toDocumentReview } from "../repository/utils";
import { assertOrgAdmin } from "./require-org-admin";

export async function getDocumentService(
    userId: string,
    organizationId: string,
    id: string,
): AsyncAppResult<DocumentDetail> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const row = await findDocumentById(id, organizationId);
        if (!row) return err(AppErrors.notFound({ targets: ["id"] }));

        const chunks = await findDocumentChunks(id, organizationId);
        const content = chunks.map((c) => c.content).join("\n\n");

        return ok({ ...toDocumentReview(row), content });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
