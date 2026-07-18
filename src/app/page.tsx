import { redirect } from "next/navigation";
import { authenticate } from "@/server/auth/auth";
import { findFirstOrganizationForUser } from "@/server/auth/require-organization";

export default async function HomePage() {
    const session = await authenticate();
    if (!session) redirect("/auth/sign-in");

    const organization = await findFirstOrganizationForUser(session.user.id);
    redirect(
        organization
            ? `/${organization.slug}/app/projects`
            : "/settings/organizations",
    );
}
