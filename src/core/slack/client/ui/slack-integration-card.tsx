"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
import { useOrganization } from "@/frontend/components/auth/organization-provider";
import { Button } from "@/frontend/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { getSlackConnectUrl, useSlack } from "../hooks";

export function SlackIntegrationCard() {
    const { organization, isPending: isOrgPending } = useOrganization();

    if (isOrgPending || !organization) {
        return <Skeleton className="h-32 w-full" />;
    }

    return <SlackIntegrationCardContent organizationId={organization.id} />;
}

function SlackIntegrationCardContent({
    organizationId,
}: {
    organizationId: string;
}) {
    const { useStatus, useDisconnect } = useSlack(organizationId);
    const { data, isPending } = useStatus();
    const disconnect = useDisconnect();

    const identity = data?.response.identity ?? null;
    const configured = data?.response.configured ?? true;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Slack</CardTitle>
                <CardDescription>
                    Conectá tu cuenta de Slack para que tus mensajes se
                    atribuyan a vos en el grafo de conocimiento.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isPending ? (
                    <Skeleton className="h-9 w-full" />
                ) : !configured ? (
                    <p className="text-muted-foreground text-sm">
                        Integración no configurada — faltan las credenciales
                        de Slack en el servidor.
                    </p>
                ) : identity ? (
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="size-4 text-primary" />
                            Conectado como{" "}
                            <span className="font-medium">
                                {identity.displayName ??
                                    identity.email ??
                                    identity.slackUserId}
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
                ) : (
                    <Button asChild size="sm">
                        <a href={getSlackConnectUrl(organizationId)}>
                            Conectar mi cuenta de Slack
                            <ExternalLink className="size-4" />
                        </a>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
