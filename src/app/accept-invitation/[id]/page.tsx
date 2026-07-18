import { redirect } from "next/navigation";
import { AcceptInvitation } from "@/frontend/components/auth/organization/accept-invitation";
import { authenticate } from "@/server/auth/auth";

// Reads live session + runs an authed mutation, so it can't be prerendered.
export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // Accepting an invitation requires a session — send guests to sign-in and
    // back, instead of letting the mutation 403.
    const session = await authenticate();
    if (!session) {
        redirect(
            `/auth/sign-in?redirectTo=${encodeURIComponent(`/accept-invitation/${id}`)}`,
        );
    }

    return (
        <main className="flex min-h-svh items-center justify-center p-6">
            <AcceptInvitation invitationId={id} />
        </main>
    );
}
