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
import { getMicrosoftIdentityConnectUrl, useMicrosoftIdentity } from "../hooks";

export function MicrosoftIdentityCard() {
    const { organization, isPending: isOrgPending } = useOrganization();

    if (isOrgPending || !organization) {
        return <Skeleton className="h-32 w-full" />;
    }

    return <MicrosoftIdentityCardContent organizationId={organization.id} />;
}

function MicrosoftIdentityCardContent({
    organizationId,
}: {
    organizationId: string;
}) {
    const { useStatus, useDisconnect } = useMicrosoftIdentity(organizationId);
    const { data, isPending } = useStatus();
    const disconnect = useDisconnect();

    const identity = data?.response.identity ?? null;
    const configured = data?.response.configured ?? true;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mi cuenta de Microsoft</CardTitle>
                <CardDescription>
                    Conectá tu cuenta de Microsoft para que tus mensajes de
                    Teams se atribuyan a vos en el grafo de conocimiento.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isPending ? (
                    <Skeleton className="h-9 w-full" />
                ) : !configured ? (
                    <p className="text-muted-foreground text-sm">
                        Integración no configurada — faltan las credenciales
                        de Microsoft en el servidor.
                    </p>
                ) : identity ? (
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="size-4 text-primary" />
                            Conectado como{" "}
                            <span className="font-medium">
                                {identity.displayName ??
                                    identity.email ??
                                    identity.microsoftUserId}
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
                        <a href={getMicrosoftIdentityConnectUrl(organizationId)}>
                            Conectar mi cuenta de Microsoft
                            <ExternalLink className="size-4" />
                        </a>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
