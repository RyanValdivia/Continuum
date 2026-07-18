import { redirect } from "next/navigation";
import { authenticate } from "@/server/auth/auth";
import { findFirstOrganizationForUser } from "@/server/auth/require-organization";

export default async function HomePage() {
    const session = await authenticate();
    if (!session) redirect("/auth/sign-in");

    const organization = await findFirstOrganizationForUser(session.user.id);
    if (organization) redirect(`/${organization.slug}/app/projects`);

    return (
        <main className="flex min-h-svh items-center justify-center p-4">
            <p className="text-muted-foreground text-sm">
                You’re not a member of any organization yet.
            </p>
        </main>
    );
}
