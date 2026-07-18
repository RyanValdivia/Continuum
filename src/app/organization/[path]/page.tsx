import { notFound } from "next/navigation";
import { Organization } from "@/frontend/components/auth/organization/organization";
import { organizationPlugin } from "@/frontend/lib/auth/organization-plugin";
import { requireAuth } from "@/server/auth/require-auth";

// Organization views read live session/query state via hooks, so this route
// can't be statically prerendered.
export const dynamic = "force-dynamic";

export default async function OrganizationPage({
    params,
}: {
    params: Promise<{ path: string }>;
}) {
    // Authed org endpoints 403 mid-render without a session — redirect logged-out
    // users to sign-in instead of surfacing "Forbidden".
    await requireAuth();

    const { path } = await params;
    const validPaths = Object.values(
        organizationPlugin().viewPaths.organization,
    );
    if (!validPaths.includes(path)) {
        notFound();
    }

    return (
        <main className="mx-auto w-full max-w-3xl p-6">
            <Organization path={path} />
        </main>
    );
}
