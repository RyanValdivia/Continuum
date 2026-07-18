import { notFound } from "next/navigation";
import { DocumentDetail } from "@/core/document-review/client/ui/detail/document-detail";
import { getDocumentService } from "@/core/document-review/server/services/get-document-service";
import { resolveResult } from "@/frontend/lib/result";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/**
 * Server entry for `/documents/[id]`. Owner/admin-only, same UI gate as the
 * list page — the service layer (`assertOrgAdmin`) is the authoritative one.
 * Awaited directly (unlike the list, this is a single-item fetch, not worth
 * the streamed-table machinery); `resolveResult` throws an
 * `AppErrorException` on failure, caught by the parent `/documents/error.tsx`
 * boundary (Next cascades error boundaries to nested routes).
 */
export default async function DocumentDetailPage({
    params,
}: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const { user } = await requireAuth();
    const { slug, id } = await params;
    const { organization, role } = await requireOrganization(slug, user.id);
    if (!ADMIN_ROLES.has(role)) notFound();

    const document = await resolveResult(
        getDocumentService(user.id, organization.id, id),
    );

    return <DocumentDetail document={document} />;
}
