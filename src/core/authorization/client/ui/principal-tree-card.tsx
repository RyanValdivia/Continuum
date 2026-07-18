"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Principal } from "@/core/authorization/domain/types";
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
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { useAuthorization } from "../hooks";

const TYPE_LABEL: Record<Principal["type"], string> = {
    person: "Persona",
    group: "Grupo",
    ou: "OU",
};

interface TreeRow {
    principal: Principal;
    depth: number;
}

/** Flattens the parentId tree into a depth-annotated, pre-order list — OUs
 *  and groups first (creatable/deletable), then unparented people last. */
function buildTree(principals: Principal[]): TreeRow[] {
    const byParent = new Map<string | null, Principal[]>();
    for (const p of principals) {
        const key = p.parentId;
        const list = byParent.get(key) ?? [];
        list.push(p);
        byParent.set(key, list);
    }
    const rows: TreeRow[] = [];
    const visit = (parentId: string | null, depth: number) => {
        for (const p of byParent.get(parentId) ?? []) {
            rows.push({ principal: p, depth });
            visit(p.id, depth + 1);
        }
    };
    visit(null, 0);
    return rows;
}

export function PrincipalTreeCard() {
    const { usePrincipals, useCreatePrincipal, useDeletePrincipal } =
        useAuthorization();
    const { data, isPending } = usePrincipals();
    const createPrincipal = useCreatePrincipal();

    const principals = data?.response ?? [];
    const tree = useMemo(() => buildTree(principals), [principals]);
    const ous = useMemo(
        () => principals.filter((p) => p.type === "ou"),
        [principals],
    );

    const [name, setName] = useState("");
    const [type, setType] = useState<"group" | "ou">("ou");
    const [parentId, setParentId] = useState<string>("__root__");

    const submit = () => {
        if (!name.trim()) return;
        createPrincipal.mutate(
            {
                type,
                name: name.trim(),
                parentId: parentId === "__root__" ? null : parentId,
            },
            {
                onSuccess: () => setName(""),
                onError: () =>
                    toast.error("No se pudo crear — revisá el padre elegido"),
            },
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Unidades organizacionales y grupos</CardTitle>
                <CardDescription>
                    Estructura tipo Active Directory: las OUs anidan personas
                    y otras OUs; los grupos son membresía plana (y pueden
                    anidarse entre sí).
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">
                            Nombre
                        </span>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Legal, Ingeniería…"
                            className="h-9 w-48"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">
                            Tipo
                        </span>
                        <Select
                            value={type}
                            onValueChange={(v) => setType(v as "group" | "ou")}
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ou">OU</SelectItem>
                                <SelectItem value="group">Grupo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">
                            Padre (OU)
                        </span>
                        <Select value={parentId} onValueChange={setParentId}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__root__">
                                    (raíz)
                                </SelectItem>
                                {ous.map((ou) => (
                                    <SelectItem key={ou.id} value={ou.id}>
                                        {ou.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        size="sm"
                        onClick={submit}
                        disabled={createPrincipal.isPending || !name.trim()}
                    >
                        Crear
                    </Button>
                </div>

                {isPending ? (
                    <Skeleton className="h-32 w-full" />
                ) : tree.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Sin OUs ni grupos todavía.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-0.5">
                        {tree.map((row) => (
                            <PrincipalRow
                                key={row.principal.id}
                                row={row}
                                useDeletePrincipal={useDeletePrincipal}
                            />
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function PrincipalRow({
    row,
    useDeletePrincipal,
}: {
    row: TreeRow;
    useDeletePrincipal: ReturnType<
        typeof useAuthorization
    >["useDeletePrincipal"];
}) {
    const deletePrincipal = useDeletePrincipal(row.principal.id);
    const { type } = row.principal;

    return (
        <li
            className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent"
            style={{ paddingLeft: `${row.depth * 20 + 6}px` }}
        >
            <div className="flex items-center gap-2">
                <Badge
                    variant={type === "person" ? "outline" : "secondary"}
                    className="shrink-0"
                >
                    {TYPE_LABEL[type]}
                </Badge>
                <span className={type === "person" ? "text-muted-foreground" : ""}>
                    {row.principal.name}
                </span>
            </div>
            {type !== "person" && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-label={`Eliminar ${row.principal.name}`}
                    disabled={deletePrincipal.isPending}
                    onClick={() =>
                        deletePrincipal.mutate(undefined, {
                            onError: () =>
                                toast.error("No se pudo eliminar"),
                        })
                    }
                >
                    <Trash2 className="size-3.5" />
                </Button>
            )}
        </li>
    );
}
