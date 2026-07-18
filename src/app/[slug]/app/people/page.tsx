import { notFound } from "next/navigation";
import { PeopleList } from "@/core/recruitment/client/ui/people-list";
import { listPeopleService } from "@/core/recruitment/server/services/list-people-service";
import { resolveResult } from "@/frontend/lib/result";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/** Owner/admin-only surface — UI gate; `assertOrgAdmin` is the authoritative one. */
export default async function PeoplePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { user } = await requireAuth();
    const { slug } = await params;
    const { organization, role } = await requireOrganization(slug, user.id);
    if (!ADMIN_ROLES.has(role)) notFound();

    const people = await resolveResult(
        listPeopleService(user.id, organization.id),
    );

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
            <div>
                <h1 className="font-semibold text-xl">Personas</h1>
                <p className="text-muted-foreground text-sm">
                    Cuando alguien sale, su nodo se convierte en la vacante y su
                    conocimiento queda disponible para reclutar y capacitar.
                </p>
            </div>
            <PeopleList people={people} />
        </div>
    );
}
