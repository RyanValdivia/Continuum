"use client";

import { Hash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMicrosoft } from "@/core/microsoft/client/hooks";
import { Button } from "@/frontend/components/ui/button";
import { Checkbox } from "@/frontend/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/frontend/components/ui/select";
import { Skeleton } from "@/frontend/components/ui/skeleton";

const WINDOW_OPTIONS = [
    { value: "7", label: "Últimos 7 días" },
    { value: "30", label: "Últimos 30 días" },
    { value: "90", label: "Últimos 90 días" },
    { value: "0", label: "Todo el historial" },
] as const;

/**
 * Pick Teams channels + a time window and ingest their conversations. Each
 * channel becomes one transcript document in the graph, plus one document per
 * active author so knowledge stays attributable by person.
 */
export function TeamsChannelPicker({
    organizationId,
}: {
    organizationId: string;
}) {
    const { useTeams, useChannels, useIngestTeams } =
        useMicrosoft(organizationId);
    const teams = useTeams();
    const ingest = useIngestTeams();

    const [teamId, setTeamId] = useState<string>("");
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [sinceDays, setSinceDays] = useState<string>("30");

    const channels = useChannels(teamId);
    const channelList = channels.data?.response.items ?? [];
    const teamList = teams.data?.response.items ?? [];

    const selectTeam = (next: string) => {
        setTeamId(next);
        setChecked(new Set());
    };

    const toggleChannel = (channelId: string, value: boolean) => {
        const next = new Set(checked);
        if (value) next.add(channelId);
        else next.delete(channelId);
        setChecked(next);
    };

    const runIngest = () => {
        ingest.mutate(
            {
                channels: [...checked].map((channelId) => ({
                    teamId,
                    channelId,
                })),
                sinceDays: Number(sinceDays) as 0 | 7 | 30 | 90,
            },
            {
                onSuccess: (res) => {
                    const { response } = res as {
                        response: { ingested: number; failed: number };
                    };
                    toast.success(
                        `Ingestados ${response.ingested} documento${response.ingested === 1 ? "" : "s"} al grafo` +
                            (response.failed
                                ? ` · ${response.failed} con error`
                                : ""),
                    );
                    setChecked(new Set());
                },
                onError: () => toast.error("Falló la ingesta de Teams"),
            },
        );
    };

    if (teams.isPending) return <Skeleton className="h-24 w-full" />;

    if (teams.error) {
        return (
            <p className="text-muted-foreground text-sm">
                No se pudieron cargar los equipos de Teams.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3 pt-3">
            <div className="flex items-center gap-2">
                <Select value={teamId} onValueChange={selectTeam}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegí un equipo" />
                    </SelectTrigger>
                    <SelectContent>
                        {teamList.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                                {team.displayName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={sinceDays} onValueChange={setSinceDays}>
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {WINDOW_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    size="sm"
                    onClick={runIngest}
                    disabled={ingest.isPending || checked.size === 0}
                >
                    {ingest.isPending
                        ? "Ingestando…"
                        : `Ingestar ${checked.size}`}
                </Button>
            </div>

            {teamId ? (
                channels.isPending ? (
                    <Skeleton className="h-24 w-full" />
                ) : channelList.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Este equipo no tiene canales visibles.
                    </p>
                ) : (
                    <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                        {channelList.map((channel) => (
                            <li
                                key={channel.id}
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                            >
                                <Checkbox
                                    checked={checked.has(channel.id)}
                                    onCheckedChange={(value) =>
                                        toggleChannel(
                                            channel.id,
                                            value === true,
                                        )
                                    }
                                />
                                <Hash className="size-4 text-muted-foreground" />
                                {channel.displayName}
                            </li>
                        ))}
                    </ul>
                )
            ) : (
                <p className="text-muted-foreground text-sm">
                    Elegí un equipo para ver sus canales. Solo aparecen los
                    equipos de los que es miembro el usuario que conectó la
                    integración.
                </p>
            )}
        </div>
    );
}
