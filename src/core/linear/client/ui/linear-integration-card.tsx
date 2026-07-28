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
import { getLinearConnectUrl, useLinear } from "../hooks";

export function LinearIntegrationCard() {
    const { organization, isPending: isOrgPending } = useOrganization();

    if (isOrgPending || !organization) {
        return <Skeleton className="h-32 w-full" />;
    }

    return <LinearIntegrationCardContent organizationId={organization.id} />;
}

function LinearIntegrationCardContent({
    organizationId,
}: {
    organizationId: string;
}) {
    const { useStatus, useDisconnect } = useLinear(organizationId);
    const { data, isPending } = useStatus();
    const disconnect = useDisconnect();

    const connection = data?.response.connection ?? null;
    const configured = data?.response.configured ?? true;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Linear</CardTitle>
                <CardDescription>
                    Conectá el Linear de la empresa para traer sus issues a
                    Continuum.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isPending ? (
                    <Skeleton className="h-9 w-full" />
                ) : !configured ? (
                    <p className="text-muted-foreground text-sm">
                        Integración no configurada — faltan las credenciales
                        de Linear en el servidor.
                    </p>
                ) : connection ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="size-4 text-primary" />
                                Conectado a{" "}
                                <span className="font-medium">
                                    {connection.workspaceName}
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
                        <LinearIssues organizationId={organizationId} />
                    </div>
                ) : (
                    <Button asChild size="sm">
                        <a href={getLinearConnectUrl(organizationId)}>
                            Conectar Linear
                            <ExternalLink className="size-4" />
                        </a>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function LinearIssues({ organizationId }: { organizationId: string }) {
    const { useIssues, useIngest } = useLinear(organizationId);
    const { data, isPending, error } = useIssues();
    const ingest = useIngest();
    const items = data?.response.items ?? [];
    const [selected, setSelected] = useState<Set<string>>(new Set());

    if (isPending) return <Skeleton className="h-16 w-full" />;

    if (error) {
        return (
            <p className="text-muted-foreground text-sm">
                No se pudieron cargar las issues.
            </p>
        );
    }

    if (items.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                No hay issues abiertas en este workspace.
            </p>
        );
    }

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const runIngest = () => {
        ingest.mutate(
            { issueIds: [...selected].slice(0, 100) },
            {
                onSuccess: (res) => {
                    const { response } = res as {
                        response: { ingested: number; failed: number };
                    };
                    toast.success(
                        `Ingestadas ${response.ingested} issue${response.ingested === 1 ? "" : "s"} al grafo` +
                            (response.failed
                                ? ` · ${response.failed} con error`
                                : ""),
                    );
                },
                onError: () => toast.error("Falló la ingesta de Linear"),
            },
        );
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                    {items.length} issue{items.length === 1 ? "" : "s"}{" "}
                    abierta{items.length === 1 ? "" : "s"}
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
                {items.map((issue) => (
                    <label
                        key={issue.id}
                        className="flex items-center gap-2 text-sm"
                    >
                        <Checkbox
                            checked={selected.has(issue.id)}
                            onCheckedChange={() => toggle(issue.id)}
                        />
                        <span className="text-muted-foreground">
                            {issue.identifier}
                        </span>
                        {issue.title}
                    </label>
                ))}
            </div>
        </div>
    );
}
