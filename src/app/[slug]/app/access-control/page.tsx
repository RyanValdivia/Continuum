import { notFound } from "next/navigation";
import { AccessControlPage } from "@/core/authorization/client/ui/access-control-page";
import { ORG_ADMIN_ROLES } from "@/server/auth/get-org-membership";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

/**
 * Server entry for `/access-control` — owner/admin-only, same UI-gate +
 * authoritative-service-layer split as `/documents`: this 404s non-admins
 * out of the route, but every mutation is re-checked by `assertOrgAdmin` in
 * the authorization domain's services regardless.
 */
export default async function AccessControlRoute({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { user } = await requireAuth();
    const { slug } = await params;
    const { role } = await requireOrganization(slug, user.id);
    if (!ORG_ADMIN_ROLES.has(role)) notFound();

    return <AccessControlPage />;
}
