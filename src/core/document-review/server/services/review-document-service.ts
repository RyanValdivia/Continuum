import "server-only";
import type {
    DocumentReview,
    ReviewDocument,
} from "@/core/document-review/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { setDocumentReview } from "../repository/set-document-review";
import { toDocumentReview } from "../repository/utils";
import { assertOrgAdmin } from "./require-org-admin";

export async function reviewDocumentService(
    userId: string,
    organizationId: string,
    id: string,
    input: ReviewDocument,
): AsyncAppResult<DocumentReview> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const row = await setDocumentReview(id, organizationId, {
            reviewStatus: input.reviewStatus,
            note: input.note,
            reviewedBy: userId,
        });
        if (!row) return err(AppErrors.notFound({ targets: ["id"] }));
        return ok(toDocumentReview(row));
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
