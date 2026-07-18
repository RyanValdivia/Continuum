import { notFound } from "next/navigation";
import { VacancyList } from "@/core/recruitment/client/ui/vacancy-list";
import { listVacanciesService } from "@/core/recruitment/server/services/list-vacancies-service";
import { resolveResult } from "@/frontend/lib/result";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

const ADMIN_ROLES = new Set(["owner", "admin"]);

export default async function HiringPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { user } = await requireAuth();
    const { slug } = await params;
    const { organization, role } = await requireOrganization(slug, user.id);
    if (!ADMIN_ROLES.has(role)) notFound();

    const vacancies = await resolveResult(
        listVacanciesService(user.id, organization.id),
    );

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
            <div>
                <h1 className="font-semibold text-xl">Contratación</h1>
                <p className="text-muted-foreground text-sm">
                    Vacantes abiertas y sus candidatos rankeados contra el
                    conocimiento del rol.
                </p>
            </div>
            <VacancyList vacancies={vacancies} />
        </div>
    );
}
