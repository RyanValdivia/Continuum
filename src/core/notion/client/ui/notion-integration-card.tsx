"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
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
import { Separator } from "@/frontend/components/ui/separator";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { buildNotionPageTree } from "../build-page-tree";
import { getNotionConnectUrl, useNotion } from "../hooks";
import { NotionPageTree } from "./notion-page-tree";

export function NotionIntegrationCard() {
    const { organization, isPending: isOrgPending } = useOrganization();

    if (isOrgPending || !organization) {
        return <Skeleton className="h-32 w-full" />;
    }

    return <NotionIntegrationCardContent organizationId={organization.id} />;
}

function NotionIntegrationCardContent({
    organizationId,
}: {
    organizationId: string;
}) {
    const { useStatus, useDisconnect } = useNotion(organizationId);
    const { data, isPending } = useStatus();
    const disconnect = useDisconnect();

    const connection = data?.response.connection ?? null;
    const configured = data?.response.configured ?? true;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notion</CardTitle>
                <CardDescription>
                    Conectá el Notion de la empresa para traer sus páginas a
                    Continuum.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isPending ? (
                    <Skeleton className="h-9 w-full" />
                ) : !configured ? (
                    <p className="text-muted-foreground text-sm">
                        Integración no configurada — faltan las credenciales de
                        Notion en el servidor.
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
                        <NotionSharedPages organizationId={organizationId} />
                    </div>
                ) : (
                    <Button asChild size="sm">
                        <a href={getNotionConnectUrl(organizationId)}>
                            Conectar Notion
                            <ExternalLink className="size-4" />
                        </a>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function NotionSharedPages({ organizationId }: { organizationId: string }) {
    const { usePages, useIngest } = useNotion(organizationId);
    const { data, isPending, error } = usePages();
    const ingest = useIngest();
    const items = data?.response.items ?? [];

    if (isPending) return <Skeleton className="h-16 w-full" />;

    if (error) {
        return (
            <p className="text-muted-foreground text-sm">
                No se pudieron cargar las páginas compartidas.
            </p>
        );
    }

    if (items.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                Nada compartido todavía — en Notion, abrí una página → "···" →
                Connections → agregá esta conexión.
            </p>
        );
    }

    const tree = buildNotionPageTree(items);
    const pageIds = items
        .filter((item) => item.object === "page")
        .map((item) => item.id)
        .slice(0, 50);

    const runIngest = () => {
        ingest.mutate(
            { pageIds },
            {
                onSuccess: (res) => {
                    const { response } = res as {
                        response: { ingested: number; failed: number };
                    };
                    toast.success(
                        `Ingestadas ${response.ingested} página${response.ingested === 1 ? "" : "s"} al grafo` +
                            (response.failed
                                ? ` · ${response.failed} con error`
                                : ""),
                    );
                },
                onError: () => toast.error("Falló la ingesta de Notion"),
            },
        );
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                    {items.length} página{items.length === 1 ? "" : "s"}{" "}
                    compartida{items.length === 1 ? "" : "s"} — compartir una
                    página en Notion comparte todas sus subpáginas.
                </p>
                <Button
                    size="sm"
                    onClick={runIngest}
                    disabled={ingest.isPending || pageIds.length === 0}
                >
                    {ingest.isPending
                        ? "Ingestando…"
                        : `Ingestar ${pageIds.length} al grafo`}
                </Button>
            </div>
            <NotionPageTree nodes={tree} />
        </div>
    );
}
