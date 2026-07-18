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
import { Separator } from "@/frontend/components/ui/separator";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/frontend/components/ui/tabs";
import { getMicrosoftConnectUrl, useMicrosoft } from "../hooks";
import { DriveItemPicker } from "./drive-item-picker";
import { TeamsChannelPicker } from "./teams-channel-picker";

export function MicrosoftIntegrationCard() {
    const { organization, isPending: isOrgPending } = useOrganization();

    if (isOrgPending || !organization) {
        return <Skeleton className="h-32 w-full" />;
    }

    return <MicrosoftIntegrationCardContent organizationId={organization.id} />;
}

function MicrosoftIntegrationCardContent({
    organizationId,
}: {
    organizationId: string;
}) {
    const { useStatus, useDisconnect } = useMicrosoft(organizationId);
    const { data, isPending } = useStatus();
    const disconnect = useDisconnect();

    const connection = data?.response.connection ?? null;
    const configured = data?.response.configured ?? true;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Microsoft 365</CardTitle>
                <CardDescription>
                    Conectá el Microsoft 365 de la empresa para traer documentos
                    de SharePoint/OneDrive y conversaciones de Teams a
                    Continuum.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isPending ? (
                    <Skeleton className="h-9 w-full" />
                ) : !configured ? (
                    <p className="text-muted-foreground text-sm">
                        Integración no configurada — faltan las credenciales de
                        Microsoft en el servidor.
                    </p>
                ) : connection ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="size-4 text-primary" />
                                Conectado al tenant{" "}
                                <span className="font-medium">
                                    {connection.tenantId}
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
                        <Tabs defaultValue="files">
                            <TabsList>
                                <TabsTrigger value="files">
                                    SharePoint / OneDrive
                                </TabsTrigger>
                                <TabsTrigger value="teams">Teams</TabsTrigger>
                            </TabsList>
                            <TabsContent value="files">
                                <DriveItemPicker
                                    organizationId={organizationId}
                                />
                            </TabsContent>
                            <TabsContent value="teams">
                                <TeamsChannelPicker
                                    organizationId={organizationId}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <Button asChild size="sm">
                        <a href={getMicrosoftConnectUrl(organizationId)}>
                            Conectar Microsoft 365
                            <ExternalLink className="size-4" />
                        </a>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
