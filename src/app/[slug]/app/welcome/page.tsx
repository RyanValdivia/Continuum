import { OnboardingEmptyState } from "@/core/onboarding/client/ui/onboarding-empty-state";
import { OnboardingJourney } from "@/core/onboarding/client/ui/onboarding-journey";
import { getMyOnboardingService } from "@/core/onboarding/server/services/get-my-onboarding-service";
import { listOnboardingTargetsService } from "@/core/onboarding/server/services/list-onboarding-targets-service";
import { resolveResult } from "@/frontend/lib/result";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

/**
 * `/[slug]/app/welcome` — the new hire's onboarding journey. Visible to any
 * member (the person living the onboarding, not an admin). Shows their plan, or
 * a generator when they don't have one yet. Auth + org come from the layout;
 * the page re-resolves them to pass ids to the services.
 */
export default async function WelcomePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { user } = await requireAuth();
    const { slug } = await params;
    const { organization } = await requireOrganization(slug, user.id);

    const [plan, targets] = await Promise.all([
        resolveResult(getMyOnboardingService(user.id, organization.id)),
        resolveResult(listOnboardingTargetsService(user.id, organization.id)),
    ]);

    return plan ? (
        <OnboardingJourney plan={plan} />
    ) : (
        <OnboardingEmptyState targets={targets} />
    );
}
