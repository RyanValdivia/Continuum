"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { VacancyListItem } from "@/core/recruitment/domain/types";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { CreateVacancyModal } from "./create-vacancy-modal";

const STATUS_LABEL: Record<VacancyListItem["status"], string> = {
    open: "Abierta",
    filled: "Cubierta",
    closed: "Cerrada",
};

export function VacancyList({ vacancies }: { vacancies: VacancyListItem[] }) {
    const { slug } = useParams<{ slug: string }>();
    const [creating, setCreating] = useState(false);

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => setCreating(true)}>Nueva vacante</Button>
            </div>
            <div className="space-y-2">
                {vacancies.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                        Aún no hay vacantes. Marca la salida de alguien en
                        Personas o crea una manual.
                    </p>
                )}
                {vacancies.map((v) => (
                    <Link
                        key={v.id}
                        href={`/${slug}/app/hiring/${v.id}`}
                        className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                        <div>
                            <div className="font-medium">{v.title}</div>
                            <div className="text-muted-foreground text-sm">
                                {v.candidateCount} candidatos · benchmark{" "}
                                {v.benchmarkType === "person"
                                    ? "por persona"
                                    : "manual"}
                            </div>
                        </div>
                        <Badge
                            variant={
                                v.status === "open" ? "default" : "secondary"
                            }
                        >
                            {STATUS_LABEL[v.status]}
                        </Badge>
                    </Link>
                ))}
            </div>
            {creating && (
                <CreateVacancyModal
                    open
                    onOpenChange={(open) => !open && setCreating(false)}
                />
            )}
        </div>
    );
}
