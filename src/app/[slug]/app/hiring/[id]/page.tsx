import { notFound } from "next/navigation";
import { VacancyAdminPanel } from "@/core/recruitment/client/ui/vacancy-admin-panel";
import { getVacancyService } from "@/core/recruitment/server/services/get-vacancy-service";
import { resolveResult } from "@/frontend/lib/result";
import { requireAuth } from "@/server/auth/require-auth";
import { requireOrganization } from "@/server/auth/require-organization";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/** Vacancy detail shell — the ranked candidate list lands with the analysis task. */
export default async function VacancyDetailPage({
    params,
}: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const { user } = await requireAuth();
    const { slug, id } = await params;
    const { organization, role } = await requireOrganization(slug, user.id);
    if (!ADMIN_ROLES.has(role)) notFound();

    const vacancy = await resolveResult(
        getVacancyService(user.id, organization.id, id),
    );

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
            <div>
                <h1 className="font-semibold text-xl">{vacancy.title}</h1>
                <p className="text-muted-foreground text-sm">
                    Benchmark{" "}
                    {vacancy.benchmarkType === "person"
                        ? "del conocimiento de la persona que salió"
                        : "de la descripción manual"}
                    .
                </p>
            </div>
            <VacancyAdminPanel vacancy={vacancy} />
        </div>
    );
}
