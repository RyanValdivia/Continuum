import { ApplyForm } from "@/core/recruitment/client/ui/apply-form";
import { getPublicVacancyService } from "@/core/recruitment/server/services/get-public-vacancy-service";

export const dynamic = "force-dynamic";

/** Public apply portal — outside the app shell, no session required. */
export default async function ApplyPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const result = await getPublicVacancyService(token);

    return (
        <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center p-6">
            {result.ok ? (
                <div className="space-y-6">
                    <div className="space-y-1">
                        <p className="text-muted-foreground text-sm">
                            {result.data.organizationName}
                        </p>
                        <h1 className="font-semibold text-2xl">
                            {result.data.title}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Sube tu CV en PDF y postúlate.
                        </p>
                    </div>
                    <ApplyForm token={token} />
                </div>
            ) : (
                <div className="space-y-2 text-center">
                    <h1 className="font-semibold text-xl">
                        Vacante no disponible
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Este link no es válido o la vacante ya no acepta
                        aplicaciones.
                    </p>
                </div>
            )}
        </main>
    );
}
