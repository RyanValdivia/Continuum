import "server-only";
import type {
    DocumentReviewSearch,
    PaginatedDocumentReviews,
} from "@/core/document-review/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findDocumentsPage } from "../repository/find-documents-page";
import { toDocumentReview } from "../repository/utils";
import { assertOrgAdmin } from "./require-org-admin";

export async function searchDocumentsService(
    userId: string,
    organizationId: string,
    params: DocumentReviewSearch,
): AsyncAppResult<PaginatedDocumentReviews> {
    const admin = await assertOrgAdmin(userId, organizationId);
    if (!admin.ok) return err(admin.error);

    try {
        const { rows, total } = await findDocumentsPage(organizationId, params);
        const pageCount = Math.ceil(total / params.perPage);
        return ok({
            items: rows.map(toDocumentReview),
            total,
            page: params.page,
            perPage: params.perPage,
            pageCount,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
