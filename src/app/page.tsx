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
        if (organization) {
            redirect(`/${organization.slug}/app/projects`);
        }
    }

    return <Landing />;
}
