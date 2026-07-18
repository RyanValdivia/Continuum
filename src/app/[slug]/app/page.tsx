import { notFound } from "next/navigation";
import { Dashboard } from "@/core/insights/client/ui/dashboard";
import { getDashboardService } from "@/core/insights/server/services/get-dashboard-service";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/**
 * The app landing: the Knowledge Continuity dashboard. Owner/admin-only — this
 * is a UI gate; `getDashboardService` (`assertOrgAdmin`) is the authoritative
 * one. A service failure bubbles to the route error boundary.
 */
export default async function DashboardPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { user } = await requireAuth();
    const { slug } = await params;
    const { organization, role } = await requireOrganization(slug, user.id);
    if (!ADMIN_ROLES.has(role)) notFound();

    const result = await getDashboardService(user.id, organization.id);
    if (!result.ok) throw new Error(result.error.code);

    return <Dashboard data={result.data} slug={slug} />;
}
