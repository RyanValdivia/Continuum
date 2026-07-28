"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useOrganization } from "@/frontend/components/auth/organization-provider";
import { Button } from "@/frontend/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";
import { Checkbox } from "@/frontend/components/ui/checkbox";
import { Separator } from "@/frontend/components/ui/separator";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { getGithubConnectUrl, useGithub } from "../hooks";

export function GithubIntegrationCard() {
    const { organization, isPending: isOrgPending } = useOrganization();

    if (isOrgPending || !organization) {
        return <Skeleton className="h-32 w-full" />;
    }

    return <GithubIntegrationCardContent organizationId={organization.id} />;
}

function GithubIntegrationCardContent({
    organizationId,
}: {
    organizationId: string;
}) {
    const { useStatus, useDisconnect } = useGithub(organizationId);
    const { data, isPending } = useStatus();
    const disconnect = useDisconnect();

    const connection = data?.response.connection ?? null;
    const configured = data?.response.configured ?? true;

    return (
        <Card>
            <CardHeader>
                <CardTitle>GitHub</CardTitle>
                <CardDescription>
                    Conectá el GitHub de la empresa para traer READMEs e
                    issues a Continuum.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isPending ? (
                    <Skeleton className="h-9 w-full" />
                ) : !configured ? (
                    <p className="text-muted-foreground text-sm">
                        Integración no configurada — faltan las credenciales
                        de GitHub en el servidor.
                    </p>
                ) : connection ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="size-4 text-primary" />
                                Conectado como{" "}
                                <span className="font-medium">
                                    {connection.githubLogin}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disconnect.mutate(undefined)}
                                disabled={disconnect.isPending}
                            >
                                Desconectar
                            </Button>
                        </div>
                        <Separator />
                        <GithubRepos organizationId={organizationId} />
                    </div>
                ) : (
                    <Button asChild size="sm">
                        <a href={getGithubConnectUrl(organizationId)}>
                            Conectar GitHub
                            <ExternalLink className="size-4" />
                        </a>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function GithubRepos({ organizationId }: { organizationId: string }) {
    const { useRepos, useIngest } = useGithub(organizationId);
    const { data, isPending, error } = useRepos();
    const ingest = useIngest();
    const items = data?.response.items ?? [];
    const [selected, setSelected] = useState<Set<string>>(new Set());

    if (isPending) return <Skeleton className="h-16 w-full" />;

    if (error) {
        return (
            <p className="text-muted-foreground text-sm">
                No se pudieron cargar los repos.
            </p>
        );
    }

    if (items.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                No hay repos accesibles con esta conexión.
            </p>
        );
    }

    const toggle = (fullName: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(fullName)) next.delete(fullName);
            else next.add(fullName);
            return next;
        });
    };

    const runIngest = () => {
        ingest.mutate(
            { repos: [...selected].slice(0, 20) },
            {
                onSuccess: (res) => {
                    const { response } = res as {
                        response: { ingested: number; failed: number };
                    };
                    toast.success(
                        `Ingestados ${response.ingested} documento${response.ingested === 1 ? "" : "s"} al grafo` +
                            (response.failed
                                ? ` · ${response.failed} con error`
                                : ""),
                    );
                },
                onError: () => toast.error("Falló la ingesta de GitHub"),
            },
        );
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                    {items.length} repo{items.length === 1 ? "" : "s"} — se
                    ingesta README + issues abiertas de cada uno.
                </p>
                <Button
                    size="sm"
                    onClick={runIngest}
                    disabled={ingest.isPending || selected.size === 0}
                >
                    {ingest.isPending
                        ? "Ingestando…"
                        : `Ingestar ${selected.size} al grafo`}
                </Button>
            </div>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {items.map((repo) => (
                    <label
                        key={repo.id}
                        className="flex items-center gap-2 text-sm"
                    >
                        <Checkbox
                            checked={selected.has(repo.fullName)}
                            onCheckedChange={() => toggle(repo.fullName)}
                        />
                        {repo.fullName}
                        {repo.private && (
                            <span className="text-muted-foreground text-xs">
                                (privado)
                            </span>
                        )}
                    </label>
                ))}
            </div>
        </div>
    );
}
