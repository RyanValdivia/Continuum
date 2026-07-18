import { notFound } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import DocumentReviewsTableServer from "@/core/document-review/client/ui/table/server";
import { documentReviewSearchSchema } from "@/core/document-review/domain/schemas";
import { documentReviewsSearchParamsCache } from "@/core/document-review/domain/search-params";
import { DataTableSkeleton } from "@/frontend/components/data-table/data-table-skeleton";
import { ORG_ADMIN_ROLES } from "@/server/auth/get-org-membership";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

/**
 * Server entry for `/documents`. Owner/admin-only surface — this is a UI gate;
 * the service layer (`assertOrgAdmin`) is the authoritative one. Parses the URL
 * into a `DocumentReviewSearch` and renders the table `server.tsx` under a
 * `<Suspense>` boundary — `server.tsx` hands the client table an unawaited
 * promise (`React.use`), so this page streams the shell immediately and the
 * table fills in once the query resolves, instead of blocking the whole route
 * on the DB round-trip.
 */
export default async function DocumentsPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<SearchParams>;
}) {
    const { user } = await requireAuth();
    const { slug } = await params;
    const { organization, role } = await requireOrganization(slug, user.id);
    if (!ORG_ADMIN_ROLES.has(role)) notFound();

    const options = documentReviewSearchSchema.parse(
        await documentReviewsSearchParamsCache.parse(searchParams),
    );

    return (
        <Suspense
            fallback={
                <div className="mx-auto w-full max-w-5xl p-6">
                    <DataTableSkeleton columnCount={6} filterCount={2} />
                </div>
            }
        >
            <DocumentReviewsTableServer
                options={options}
                organizationId={organization.id}
                slug={slug}
            />
        </Suspense>
    );
}
