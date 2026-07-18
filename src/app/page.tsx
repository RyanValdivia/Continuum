import { redirect } from "next/navigation";
import { Landing } from "@/frontend/components/landing";
import { authenticate } from "@/server/auth/auth";
import { findFirstOrganizationForUser } from "@/server/auth/require-organization";

export default async function HomePage() {
    const session = await authenticate();

    if (session) {
        const organization = await findFirstOrganizationForUser(
            session.user.id,
        );
        redirect(
            organization ? `/${organization.slug}/app/projects` : "/onboarding",
        );
    }

    return <Landing />;
}
