import { notFound } from "next/navigation";
import { OrganizationsSettings } from "@/frontend/components/auth/organization/organizations-settings";
import { organizationPlugin } from "@/frontend/lib/auth/organization-plugin";
import { requireAuth } from "@/server/auth/require-auth";

// Settings views read live session/query state via hooks, so this route
// can't be statically prerendered.
export const dynamic = "force-dynamic";

export default async function SettingsPage({
    params,
}: {
    params: Promise<{ path: string }>;
}) {
    // Client hooks here call authed org endpoints; without a session they 403
    // ("Forbidden") mid-render. Guard first so logged-out users are redirected
    // to sign-in instead.
    await requireAuth();

    const { path } = await params;
    if (path !== organizationPlugin().viewPaths.settings.organizations) {
        notFound();
    }

    return (
        <main className="mx-auto w-full max-w-3xl p-6">
            <OrganizationsSettings />
        </main>
    );
}
