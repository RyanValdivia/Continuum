"use client";

import { ChevronDown, ChevronUp, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import type { RankedCandidate } from "@/core/recruitment/domain/types";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { useRecruitment } from "../hooks";

const STATUS_LABEL: Record<RankedCandidate["candidate"]["status"], string> = {
    pending: "Analizando…",
    analyzed: "Analizado",
    failed: "Análisis fallido",
};

function scoreVariant(score: number): "default" | "secondary" | "outline" {
    if (score >= 75) return "default";
    if (score >= 50) return "secondary";
    return "outline";
}

export function CandidateList({ items }: { items: RankedCandidate[] }) {
    const { useRetryAnalysis, useDeleteCandidate } = useRecruitment();
    const retry = useRetryAnalysis();
    const del = useDeleteCandidate();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (items.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                Aún no hay candidatos. Comparte el link público de la vacante.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {items.map(({ candidate, analysis }, index) => {
                const expanded = expandedId === candidate.id;
                return (
                    <div key={candidate.id} className="rounded-lg border">
                        <button
                            type="button"
                            className="flex w-full items-center gap-3 p-4 text-left"
                            onClick={() =>
                                setExpandedId(expanded ? null : candidate.id)
                            }
                        >
                            <span className="text-muted-foreground text-sm">
                                #{index + 1}
                            </span>
                            <div className="flex-1">
                                <div className="font-medium">
                                    {candidate.name}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    {candidate.email} · {candidate.cvFilename}
                                </div>
                            </div>
                            {analysis ? (
                                <Badge variant={scoreVariant(analysis.score)}>
                                    {Math.round(analysis.score)}/100
                                </Badge>
                            ) : (
                                <Badge variant="secondary">
                                    {STATUS_LABEL[candidate.status]}
                                </Badge>
                            )}
                            {expanded ? <ChevronUp /> : <ChevronDown />}
                        </button>

                        {expanded && (
                            <div className="space-y-4 border-t p-4">
                                {candidate.status === "failed" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={retry.isPending}
                                        onClick={() =>
                                            retry.mutate(candidate.id)
                                        }
                                    >
                                        <RefreshCw /> Reintentar análisis
                                    </Button>
                                )}
                                {analysis && (
                                    <>
                                        <p className="text-sm">
                                            {analysis.summary}
                                        </p>
                                        <div className="space-y-3">
                                            {analysis.dimensions.map((d) => (
                                                <div key={d.name}>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="font-medium">
                                                            {d.name}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {Math.round(
                                                                d.score,
                                                            )}
                                                            /100
                                                        </span>
                                                    </div>
                                                    {d.strengths.length > 0 && (
                                                        <ul className="list-inside list-disc text-sm">
                                                            {d.strengths.map(
                                                                (s) => (
                                                                    <li key={s}>
                                                                        {s}
                                                                    </li>
                                                                ),
                                                            )}
                                                        </ul>
                                                    )}
                                                    {d.gaps.length > 0 && (
                                                        <ul className="list-inside list-disc text-muted-foreground text-sm">
                                                            {d.gaps.map((g) => (
                                                                <li key={g}>
                                                                    {g}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <div className="mb-1 font-medium text-sm">
                                                Preguntas para la entrevista
                                            </div>
                                            <ol className="list-inside list-decimal space-y-1 text-sm">
                                                {analysis.interviewQuestions.map(
                                                    (q) => (
                                                        <li key={q.question}>
                                                            {q.question}
                                                            <span className="ml-1 text-muted-foreground text-xs">
                                                                · mide:{" "}
                                                                {q.measures}
                                                            </span>
                                                        </li>
                                                    ),
                                                )}
                                            </ol>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={del.isPending}
                                        onClick={() => {
                                            if (
                                                window.confirm(
                                                    `¿Eliminar a ${candidate.name}? Se borra su CV y análisis.`,
                                                )
                                            ) {
                                                del.mutate(candidate.id);
                                            }
                                        }}
                                    >
                                        <Trash2 /> Eliminar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
