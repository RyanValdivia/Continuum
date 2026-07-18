"use client";

import { CheckCircle2, ExternalLink, Hash, Lock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/frontend/auth/auth";
import { useOrganization } from "@/frontend/components/auth/organization-provider";
import { Badge } from "@/frontend/components/ui/badge";
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
import { Switch } from "@/frontend/components/ui/switch";
import type { SlackChannel } from "../../domain/types";
import { getSlackWorkspaceConnectUrl, useSlackWorkspace } from "../hooks";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/** Org-wide bot install + channel picker. Owner/admin only — a plain member
 *  never sees this card, unlike the personal Slack link above it. */
export function SlackWorkspaceCard() {
    const { organization, isPending: isOrgPending } = useOrganization();
    const { data: role, isPending: isRolePending } =
        authClient.useActiveMemberRole();

    if (isOrgPending || isRolePending || !organization) {
        return <Skeleton className="h-32 w-full" />;
    }

    if (!role?.role || !ADMIN_ROLES.has(role.role)) {
        return null;
    }

    return <SlackWorkspaceCardContent organizationId={organization.id} />;
}

function SlackWorkspaceCardContent({
    organizationId,
}: {
    organizationId: string;
}) {
    const { useStatus, useDisconnect } = useSlackWorkspace(organizationId);
    const { data, isPending } = useStatus();
    const disconnect = useDisconnect();

    const connection = data?.response.connection ?? null;
    const configured = data?.response.configured ?? true;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Slack — canales monitoreados</CardTitle>
                <CardDescription>
                    Instalá el bot en el workspace y elegí qué canales
                    alimentan el grafo de conocimiento. Solo owners/admins.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isPending ? (
                    <Skeleton className="h-9 w-full" />
                ) : !configured ? (
                    <p className="text-muted-foreground text-sm">
                        Integración no configurada — faltan
                        SLACK_CLIENT_ID/SECRET/SIGNING_SECRET en el servidor.
                    </p>
                ) : connection ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="size-4 text-primary" />
                                Bot instalado en{" "}
                                <span className="font-medium">
                                    {connection.teamName}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disconnect.mutate(undefined)}
                                disabled={disconnect.isPending}
                            >
                                Desinstalar
                            </Button>
                        </div>
                        <Separator />
                        <SlackChannelPicker organizationId={organizationId} />
                    </div>
                ) : (
                    <Button asChild size="sm">
                        <a href={getSlackWorkspaceConnectUrl(organizationId)}>
                            Instalar bot de Slack
                            <ExternalLink className="size-4" />
                        </a>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function SlackChannelPicker({ organizationId }: { organizationId: string }) {
    const { useChannels } = useSlackWorkspace(organizationId);
    const { data, isPending, error } = useChannels();
    const channels = data?.response.channels ?? [];

    if (isPending) return <Skeleton className="h-24 w-full" />;

    if (error) {
        return (
            <p className="text-muted-foreground text-sm">
                No se pudieron cargar los canales.
            </p>
        );
    }

    if (channels.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                No hay canales visibles todavía.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs">
                Los canales privados necesitan que invites al bot manualmente
                (<code>/invite @bot</code> en Slack) antes de que "Monitorear"
                empiece a traer mensajes.
            </p>
            <ul className="flex flex-col gap-1">
                {channels.map((channel) => (
                    <SlackChannelRow
                        key={channel.id}
                        organizationId={organizationId}
                        channel={channel}
                    />
                ))}
            </ul>
        </div>
    );
}

function SlackChannelRow({
    organizationId,
    channel,
}: {
    organizationId: string;
    channel: SlackChannel;
}) {
    const { useToggleChannel, useSyncChannel } = useSlackWorkspace(
        organizationId,
    );
    const toggle = useToggleChannel(channel.id);
    const sync = useSyncChannel(channel.id);

    return (
        <li className="flex items-center justify-between gap-3 rounded px-1.5 py-1.5 text-sm hover:bg-accent">
            <div className="flex min-w-0 items-center gap-2">
                {channel.isPrivate ? (
                    <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                    <Hash className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{channel.name}</span>
                {channel.isMonitored && !channel.botIsMember && (
                    <Badge variant="outline" className="shrink-0">
                        invitá al bot
                    </Badge>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {channel.isMonitored && channel.botIsMember && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label="Sincronizar ahora"
                        disabled={sync.isPending}
                        onClick={() =>
                            sync.mutate(undefined, {
                                onSuccess: (res) => {
                                    const { response } = res as {
                                        response: {
                                            ingested: number;
                                            skipped: number;
                                        };
                                    };
                                    toast.success(
                                        `Ingeridos ${response.ingested}, omitidos ${response.skipped}`,
                                    );
                                },
                                onError: () =>
                                    toast.error("Falló la sincronización"),
                            })
                        }
                    >
                        <RefreshCw
                            className={sync.isPending ? "animate-spin" : ""}
                        />
                    </Button>
                )}
                <Switch
                    checked={channel.isMonitored}
                    disabled={toggle.isPending}
                    onCheckedChange={(checked) =>
                        toggle.mutate({ isMonitored: checked })
                    }
                />
            </div>
        </li>
    );
}
