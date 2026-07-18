"use client";

import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { Switch } from "@/frontend/components/ui/switch";
import { useAuthorization } from "../hooks";

export function AccessPolicyCard() {
    const { useAccessPolicy, useSetAccessPolicy } = useAuthorization();
    const { data, isPending } = useAccessPolicy();
    const setPolicy = useSetAccessPolicy();

    const closed = data?.response.defaultAccess === "closed";

    return (
        <Card>
            <CardHeader>
                <CardTitle>Política de acceso por defecto</CardTitle>
                <CardDescription>
                    <strong>Abierta</strong>: un recurso sin permisos
                    explícitos es visible para cualquier miembro (por
                    defecto). <strong>Cerrada</strong>: un recurso necesita un
                    permiso explícito de "allow" para ser visible.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isPending ? (
                    <Skeleton className="h-9 w-48" />
                ) : (
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={closed}
                            disabled={setPolicy.isPending}
                            onCheckedChange={(checked) =>
                                setPolicy.mutate(
                                    {
                                        defaultAccess: checked
                                            ? "closed"
                                            : "open",
                                    },
                                    {
                                        onError: () =>
                                            toast.error(
                                                "No se pudo actualizar la política",
                                            ),
                                    },
                                )
                            }
                        />
                        <span className="text-sm">
                            {closed ? "Cerrada" : "Abierta"}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
