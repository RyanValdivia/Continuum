import { notFound } from "next/navigation";
import { PersonProfileView } from "@/core/insights/client/ui/person-profile";
import { getPersonProfileService } from "@/core/insights/server/services/get-person-profile-service";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

/**
 * `/[slug]/app/people/[id]` — a colleague's profile and their agent. Member
 * visible: `requireOrganization` enforces org membership, and the service
 * gates on membership too. `id` is the member id (= the `personId` attribution).
 */
export default async function PersonProfilePage({
    params,
}: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const { user } = await requireAuth();
    const { slug, id } = await params;
    const { organization } = await requireOrganization(slug, user.id);

    const result = await getPersonProfileService(user.id, organization.id, id);
    if (!result.ok) {
        if (result.error.status === 404) notFound();
        throw new Error(result.error.code);
    }

    return <PersonProfileView profile={result.data} slug={slug} />;
}
