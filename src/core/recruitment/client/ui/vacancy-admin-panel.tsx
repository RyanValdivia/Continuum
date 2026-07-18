"use client";

import { Check, Copy, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import type { Vacancy } from "@/core/recruitment/domain/types";
import { Button } from "@/frontend/components/ui/button";
import { useRecruitment } from "../hooks";

export function VacancyAdminPanel({ vacancy }: { vacancy: Vacancy }) {
    const { useRegenerateToken, useCloseVacancy } = useRecruitment();
    const regenerate = useRegenerateToken(vacancy.id);
    const close = useCloseVacancy(vacancy.id);
    const [copied, setCopied] = useState(false);

    const applyPath = `/apply/${vacancy.publicToken}`;

    const copyLink = async () => {
        await navigator.clipboard.writeText(
            `${window.location.origin}${applyPath}`,
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border p-4">
            <code className="flex-1 truncate text-muted-foreground text-sm">
                {applyPath}
            </code>
            <Button variant="outline" size="sm" onClick={copyLink}>
                {copied ? <Check /> : <Copy />} Copiar link
            </Button>
            <Button
                variant="outline"
                size="sm"
                disabled={regenerate.isPending}
                onClick={() => regenerate.mutate(undefined)}
            >
                <RefreshCw /> Regenerar
            </Button>
            {vacancy.status === "open" && (
                <Button
                    variant="outline"
                    size="sm"
                    disabled={close.isPending}
                    onClick={() => close.mutate(undefined)}
                >
                    <XCircle /> Cerrar vacante
                </Button>
            )}
        </div>
    );
}
