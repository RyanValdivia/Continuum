"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/frontend/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/frontend/components/ui/select";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { useAuthorization } from "../hooks";

export function MembershipEditorCard() {
    const { usePrincipals } = useAuthorization();
    const { data } = usePrincipals();
    const principals = data?.response ?? [];
    const groups = useMemo(
        () => principals.filter((p) => p.type === "group"),
        [principals],
    );

    const [groupId, setGroupId] = useState<string>("");
    const activeGroup = groupId || groups[0]?.id || "";

    return (
        <Card>
            <CardHeader>
                <CardTitle>Membresía de grupos</CardTitle>
                <CardDescription>
                    Un grupo puede contener personas u otros grupos (anidado).
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {groups.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Creá un grupo primero.
                    </p>
                ) : (
                    <>
                        <Select value={activeGroup} onValueChange={setGroupId}>
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="Elegí un grupo" />
                            </SelectTrigger>
                            <SelectContent>
                                {groups.map((g) => (
                                    <SelectItem key={g.id} value={g.id}>
                                        {g.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {activeGroup && (
                            <GroupRoster
                                groupId={activeGroup}
                                allPrincipals={principals}
                            />
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function GroupRoster({
    groupId,
    allPrincipals,
}: {
    groupId: string;
    allPrincipals: { id: string; name: string; type: string }[];
}) {
    const { useMembershipsFor, useSetMembership, useRemoveMembership } =
        useAuthorization();
    const { data, isPending, refetch } = useMembershipsFor(groupId);
    const setMembership = useSetMembership();
    const removeMembership = useRemoveMembership();
    const [candidateId, setCandidateId] = useState<string>("");

    const nameOf = (id: string) =>
        allPrincipals.find((p) => p.id === id)?.name ?? id;

    const memberships = data?.response ?? [];
    const memberIds = new Set(memberships.map((m) => m.memberId));
    const candidates = allPrincipals.filter(
        (p) => p.id !== groupId && p.type !== "ou" && !memberIds.has(p.id),
    );

    const addMember = () => {
        if (!candidateId) return;
        setMembership.mutate(
            { memberId: candidateId, groupId },
            {
                onSuccess: () => {
                    setCandidateId("");
                    refetch();
                },
                onError: () => toast.error("No se pudo agregar"),
            },
        );
    };

    const removeMember = (memberId: string) => {
        removeMembership.mutate(
            { memberId, groupId },
            {
                onSuccess: () => refetch(),
                onError: () => toast.error("No se pudo quitar"),
            },
        );
    };

    if (isPending) return <Skeleton className="h-20 w-full" />;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Select value={candidateId} onValueChange={setCandidateId}>
                    <SelectTrigger className="w-64">
                        <SelectValue placeholder="Agregar persona o grupo…" />
                    </SelectTrigger>
                    <SelectContent>
                        {candidates.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    size="sm"
                    onClick={addMember}
                    disabled={!candidateId || setMembership.isPending}
                >
                    Agregar
                </Button>
            </div>
            {memberships.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Sin miembros todavía.
                </p>
            ) : (
                <ul className="flex flex-col gap-0.5">
                    {memberships.map((m) => (
                        <li
                            key={m.id}
                            className="flex items-center justify-between rounded px-1.5 py-1 text-sm hover:bg-accent"
                        >
                            {nameOf(m.memberId)}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                disabled={removeMembership.isPending}
                                onClick={() => removeMember(m.memberId)}
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
