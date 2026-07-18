import { redirect } from "next/navigation";
import { OnboardingCreateOrg } from "@/frontend/components/onboarding/onboarding-create-org";
import { requireAuth } from "@/server/auth/require-auth";
import { findFirstOrganizationForUser } from "@/server/auth/require-organization";

// Reads live session/org state via hooks in the create-org form.
export const dynamic = "force-dynamic";

/**
 * Onboarding entry. A signed-in user with no organization lands here (from the
 * home redirect) to create one. If they already belong to an org, skip straight
 * into the app.
 */
export default async function OnboardingPage() {
    const { user } = await requireAuth();

    const organization = await findFirstOrganizationForUser(user.id);
    if (organization) {
        redirect(`/${organization.slug}/app/projects`);
    }

    return (
        <main className="flex min-h-svh items-center justify-center p-4">
            <OnboardingCreateOrg />
        </main>
    );
}
