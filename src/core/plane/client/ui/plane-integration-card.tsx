"use client";

import { CheckCircle2 } from "lucide-react";
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
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Separator } from "@/frontend/components/ui/separator";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { usePlane } from "../hooks";

export function PlaneIntegrationCard() {
    const { organization, isPending: isOrgPending } = useOrganization();

    if (isOrgPending || !organization) {
        return <Skeleton className="h-32 w-full" />;
    }

    return <PlaneIntegrationCardContent organizationId={organization.id} />;
}

function PlaneIntegrationCardContent({
    organizationId,
}: {
    organizationId: string;
}) {
    const { useStatus, useDisconnect } = usePlane(organizationId);
    const { data, isPending } = useStatus();
    const disconnect = useDisconnect();

    const connection = data?.response.connection ?? null;
    const configured = data?.response.configured ?? true;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Plane</CardTitle>
                <CardDescription>
                    Conectá el workspace de Plane (plane.so o self-hosted)
                    para traer sus issues a Continuum.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isPending ? (
                    <Skeleton className="h-9 w-full" />
                ) : !configured ? (
                    <p className="text-muted-foreground text-sm">
                        Integración no configurada — falta la clave de
                        cifrado en el servidor.
                    </p>
                ) : connection ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="size-4 text-primary" />
                                Conectado a{" "}
                                <span className="font-medium">
                                    {connection.workspaceSlug}
                                </span>{" "}
                                <span className="text-muted-foreground">
                                    ({connection.baseUrl})
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
                        <PlaneProjects organizationId={organizationId} />
                    </div>
                ) : (
                    <PlaneConnectForm organizationId={organizationId} />
                )}
            </CardContent>
        </Card>
    );
}

function PlaneConnectForm({ organizationId }: { organizationId: string }) {
    const { useConnect } = usePlane(organizationId);
    const connect = useConnect();
    const [baseUrl, setBaseUrl] = useState("https://api.plane.so");
    const [workspaceSlug, setWorkspaceSlug] = useState("");
    const [apiKey, setApiKey] = useState("");

    const canSubmit = baseUrl.trim() && workspaceSlug.trim() && apiKey.trim();

    const submit = () => {
        connect.mutate(
            { baseUrl: baseUrl.trim(), workspaceSlug: workspaceSlug.trim(), apiKey: apiKey.trim() },
            {
                onSuccess: () => {
                    toast.success("Plane conectado");
                    setApiKey("");
                },
                onError: () =>
                    toast.error(
                        "No se pudo conectar — revisá la URL, el workspace y la API key",
                    ),
            },
        );
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="plane-base-url">URL de la instancia</Label>
                <Input
                    id="plane-base-url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.plane.so"
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="plane-workspace-slug">Workspace slug</Label>
                <Input
                    id="plane-workspace-slug"
                    value={workspaceSlug}
                    onChange={(e) => setWorkspaceSlug(e.target.value)}
                    placeholder="mi-workspace"
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="plane-api-key">API key</Label>
                <Input
                    id="plane-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="plane_api_..."
                />
                <p className="text-muted-foreground text-xs">
                    Generala en Plane → Workspace Settings → API Tokens.
                </p>
            </div>
            <Button
                size="sm"
                onClick={submit}
                disabled={!canSubmit || connect.isPending}
            >
                {connect.isPending ? "Conectando…" : "Conectar Plane"}
            </Button>
        </div>
    );
}

function PlaneProjects({ organizationId }: { organizationId: string }) {
    const { useProjects, useIngest } = usePlane(organizationId);
    const { data, isPending, error } = useProjects();
    const ingest = useIngest();
    const items = data?.response.items ?? [];
    const [selected, setSelected] = useState<Set<string>>(new Set());

    if (isPending) return <Skeleton className="h-16 w-full" />;

    if (error) {
        return (
            <p className="text-muted-foreground text-sm">
                No se pudieron cargar los proyectos.
            </p>
        );
    }

    if (items.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                No hay proyectos en este workspace.
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
            { projectIds: [...selected].slice(0, 20) },
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
                onError: () => toast.error("Falló la ingesta de Plane"),
            },
        );
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                    {items.length} proyecto{items.length === 1 ? "" : "s"} —
                    se ingestan todas las issues de cada uno seleccionado.
                </p>
                <Button
                    size="sm"
                    onClick={runIngest}
                    disabled={ingest.isPending || selected.size === 0}
                >
                    {ingest.isPending
                        ? "Ingestando…"
                        : `Ingestar ${selected.size} proyecto${selected.size === 1 ? "" : "s"}`}
                </Button>
            </div>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {items.map((project) => (
                    <label
                        key={project.id}
                        className="flex items-center gap-2 text-sm"
                    >
                        <Checkbox
                            checked={selected.has(project.id)}
                            onCheckedChange={() => toggle(project.id)}
                        />
                        <span className="text-muted-foreground">
                            {project.identifier}
                        </span>
                        {project.name}
                    </label>
                ))}
            </div>
        </div>
    );
}
