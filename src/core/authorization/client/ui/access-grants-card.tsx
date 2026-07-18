"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/frontend/components/ui/select";
import { useAuthorization } from "../hooks";

type ResourceType = "knowledge_node" | "source_document" | "ou";

const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
    knowledge_node: "Nodo de conocimiento",
    source_document: "Documento fuente",
    ou: "OU",
};

/**
 * Manual grant form — `resourceId` is typed in by hand rather than picked
 * from a live list, since resource ids live in the `knowledge`/
 * `document-review` domains and this component deliberately doesn't import
 * their repositories/services (cross-domain isolation). Copy the id from
 * the knowledge graph's node detail panel or the documents table.
 */
export function AccessGrantsCard() {
    const { usePrincipals, useAcesFor, useGrantAccess } = useAuthorization();
    const { data: principalsData } = usePrincipals();
    const principals = principalsData?.response ?? [];

    const [resourceType, setResourceType] =
        useState<ResourceType>("source_document");
    const [resourceId, setResourceId] = useState("");
    const [principalId, setPrincipalId] = useState("");
    const [effect, setEffect] = useState<"allow" | "deny">("allow");

    const lookupId = resourceId.trim();
    const { data: acesData, refetch } = useAcesFor({
        resourceType,
        resourceId: lookupId || "__none__",
    });
    const grantAccess = useGrantAccess();

    const aces = lookupId ? (acesData?.response ?? []) : [];
    const nameOf = useMemo(
        () => (id: string) => principals.find((p) => p.id === id)?.name ?? id,
        [principals],
    );

    const grant = () => {
        if (!lookupId || !principalId) return;
        grantAccess.mutate(
            {
                resourceType,
                resourceId: lookupId,
                principalId,
                permission: "read",
                effect,
                inheritable: true,
            },
            {
                onSuccess: () => refetch(),
                onError: () => toast.error("No se pudo otorgar el permiso"),
            },
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Permisos por recurso</CardTitle>
                <CardDescription>
                    Otorgá o negá acceso a un documento o nodo específico para
                    una OU, grupo o persona. Un "deny" siempre gana sobre un
                    "allow".
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">
                            Tipo de recurso
                        </span>
                        <Select
                            value={resourceType}
                            onValueChange={(v) =>
                                setResourceType(v as ResourceType)
                            }
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(
                                    Object.keys(
                                        RESOURCE_TYPE_LABEL,
                                    ) as ResourceType[]
                                ).map((rt) => (
                                    <SelectItem key={rt} value={rt}>
                                        {RESOURCE_TYPE_LABEL[rt]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">
                            ID del recurso
                        </span>
                        <Input
                            value={resourceId}
                            onChange={(e) => setResourceId(e.target.value)}
                            placeholder="uuid…"
                            className="h-9 w-64"
                        />
                    </div>
                </div>

                {lookupId && (
                    <div className="flex flex-col gap-3 border-t pt-3">
                        <div className="flex flex-wrap items-end gap-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-xs">
                                    Principal
                                </span>
                                <Select
                                    value={principalId}
                                    onValueChange={setPrincipalId}
                                >
                                    <SelectTrigger className="w-56">
                                        <SelectValue placeholder="OU, grupo o persona" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {principals.map((p) => (
                                            <SelectItem
                                                key={p.id}
                                                value={p.id}
                                            >
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-xs">
                                    Efecto
                                </span>
                                <Select
                                    value={effect}
                                    onValueChange={(v) =>
                                        setEffect(v as "allow" | "deny")
                                    }
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="allow">
                                            Allow
                                        </SelectItem>
                                        <SelectItem value="deny">
                                            Deny
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                size="sm"
                                onClick={grant}
                                disabled={
                                    !principalId || grantAccess.isPending
                                }
                            >
                                Otorgar
                            </Button>
                        </div>

                        {aces.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Sin permisos explícitos — sigue la política
                                por defecto de la organización.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-0.5">
                                {aces.map((ace) => (
                                    <AceRow
                                        key={ace.id}
                                        id={ace.id}
                                        effect={ace.effect}
                                        principalName={nameOf(
                                            ace.principalId,
                                        )}
                                        onRevoked={refetch}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function AceRow({
    id,
    effect,
    principalName,
    onRevoked,
}: {
    id: string;
    effect: "allow" | "deny";
    principalName: string;
    onRevoked: () => void;
}) {
    const { useRevokeAccess } = useAuthorization();
    const revokeAccess = useRevokeAccess(id);

    return (
        <li className="flex items-center justify-between rounded px-1.5 py-1 text-sm hover:bg-accent">
            <div className="flex items-center gap-2">
                <Badge variant={effect === "deny" ? "destructive" : "default"}>
                    {effect}
                </Badge>
                {principalName}
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={revokeAccess.isPending}
                onClick={() =>
                    revokeAccess.mutate(undefined, {
                        onSuccess: onRevoked,
                        onError: () => toast.error("No se pudo revocar"),
                    })
                }
            >
                <Trash2 className="size-3.5" />
            </Button>
        </li>
    );
}
