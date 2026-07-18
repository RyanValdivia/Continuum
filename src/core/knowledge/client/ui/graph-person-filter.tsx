"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/frontend/components/ui/select";

const ALL = "__all__";

/** Short, opaque label for a personId (no person table yet). */
function personLabel(id: string): string {
    return `Persona ${id.slice(0, 6)}`;
}

export function GraphPersonFilter({
    personIds,
    value,
    onChange,
}: {
    personIds: string[];
    value: string | null;
    onChange: (personId: string | null) => void;
}) {
    if (personIds.length === 0) return null;
    return (
        <div className="absolute bottom-4 left-4 z-10">
            <Select
                value={value ?? ALL}
                onValueChange={(v) => onChange(v === ALL ? null : v)}
            >
                <SelectTrigger className="w-48 bg-background/70 backdrop-blur">
                    <SelectValue placeholder="Todas las personas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>Todas las personas</SelectItem>
                    {personIds.map((id) => (
                        <SelectItem key={id} value={id}>
                            {personLabel(id)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
