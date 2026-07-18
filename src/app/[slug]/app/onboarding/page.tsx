import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";

/**
 * Onboarding step 2 (org-scoped): the organization exists — now seed its memory.
 * The first ingestion is the Notion integration. Auth + org are enforced by the
 * parent `[slug]/app` layout.
 */
export default async function AppOnboardingPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    return (
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-semibold text-2xl">
                    Tu organización está lista
                </h1>
                <p className="text-muted-foreground">
                    Ahora llena la memoria. La primera ingesta es tu Notion:
                    conéctalo y traemos tus páginas al grafo de conocimiento.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="size-5 text-primary" />
                        Primera ingesta — conecta Notion
                    </CardTitle>
                    <CardDescription>
                        Eliges qué páginas compartir desde Notion; nosotros las
                        convertimos en conocimiento consultable.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button asChild>
                        <Link href={`/${slug}/app/integrations`}>
                            Conectar Notion
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                    <Button asChild variant="ghost">
                        <Link href={`/${slug}/app/knowledge`}>
                            Explorar la app
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}
