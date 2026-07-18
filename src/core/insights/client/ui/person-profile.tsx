import { FileText, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import type {
    PersonProfile,
    ProfileItem,
} from "@/core/insights/domain/person-profile";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";

function Tile({ label, value }: { label: string; value: number }) {
    return (
        <Card className="py-4">
            <CardContent className="px-4">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="mt-1 font-semibold text-2xl tabular-nums">
                    {value}
                </p>
            </CardContent>
        </Card>
    );
}

function KnowHowSection({
    title,
    items,
}: {
    title: string;
    items: ProfileItem[];
}) {
    if (items.length === 0) return null;
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="grid gap-3">
                    {items.map((item) => (
                        <li key={item.label}>
                            <p className="font-medium text-sm">{item.label}</p>
                            {item.summary && (
                                <p className="text-muted-foreground text-sm">
                                    {item.summary}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

/** Pantalla 2 — a person and the know-how the graph captured from them. */
export function PersonProfileView({
    profile,
    slug,
}: {
    profile: PersonProfile;
    slug: string;
}) {
    const { person, counts } = profile;
    const chatHref = `/${slug}/app/knowledge?personId=${encodeURIComponent(
        person.memberId,
    )}&name=${encodeURIComponent(person.name)}`;

    return (
        <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
            <Card>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-lg text-primary">
                            {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="truncate font-semibold text-xl">
                                    {person.name}
                                </h1>
                                <Badge variant="secondary">{person.role}</Badge>
                            </div>
                            <p className="truncate text-muted-foreground text-sm">
                                {person.email}
                            </p>
                        </div>
                    </div>
                    <Button asChild size="lg" className="shrink-0">
                        <Link href={chatHref}>
                            <MessageSquare className="size-4" />
                            Hablar con el agente de {person.name}
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            {profile.hasKnowledge ? (
                <>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Tile label="Decisiones" value={counts.decisions} />
                        <Tile label="Procesos" value={counts.processes} />
                        <Tile label="Conceptos" value={counts.concepts} />
                        <Tile label="Documentos" value={counts.documents} />
                    </div>

                    <KnowHowSection
                        title="Decisiones"
                        items={profile.decisions}
                    />
                    <KnowHowSection
                        title="Procesos"
                        items={profile.processes}
                    />
                    <KnowHowSection
                        title="Conceptos"
                        items={profile.concepts}
                    />

                    {profile.documents.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Documentos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="grid gap-2">
                                    {profile.documents.map((doc) => (
                                        <li
                                            key={doc.title}
                                            className="flex items-center gap-2 text-sm"
                                        >
                                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                                            {doc.url ? (
                                                <a
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="truncate hover:underline"
                                                >
                                                    {doc.title}
                                                </a>
                                            ) : (
                                                <span className="truncate">
                                                    {doc.title}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                        <Sparkles className="size-8 text-muted-foreground" />
                        <div>
                            <p className="font-medium">
                                Aún no hay conocimiento capturado de{" "}
                                {person.name}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                Conecta fuentes (Notion, Microsoft, Slack) o
                                entrevista a esta persona para empezar a modelar
                                su criterio.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
