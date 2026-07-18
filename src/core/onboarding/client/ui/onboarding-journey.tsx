"use client";

import {
    BookOpen,
    CheckCircle2,
    GraduationCap,
    MessagesSquare,
    Sparkles,
} from "lucide-react";
import { useState } from "react";
import type {
    OnboardingPlanView,
    OnboardingTask,
    TaskType,
} from "@/core/onboarding/domain/types";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";
import { Checkbox } from "@/frontend/components/ui/checkbox";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/frontend/components/ui/sheet";
import { cn } from "@/frontend/lib/utils";
import { useOnboarding } from "../hooks";
import { PersonAgentChat } from "./person-agent-chat";

const TASK_META: Record<TaskType, { label: string; icon: typeof BookOpen }> = {
    read: { label: "Leer", icon: BookOpen },
    talk: { label: "Hablar", icon: MessagesSquare },
    do: { label: "Hacer", icon: CheckCircle2 },
};

export function OnboardingJourney({ plan }: { plan: OnboardingPlanView }) {
    const { useToggleTask } = useOnboarding();
    const toggle = useToggleTask();
    const done = new Set(plan.completedTaskIds);

    const [chatSeed, setChatSeed] = useState<string | null>(null);
    const agentName = plan.benchmarkPersonName;

    const { done: doneCount, total, isComplete } = plan.progress;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
            <header className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Sparkles className="size-4 text-primary" />
                    Tu onboarding
                </div>
                <h1 className="font-semibold text-2xl">{plan.roleTitle}</h1>
                {agentName ? (
                    <p className="text-muted-foreground text-sm">
                        Sucedes a{" "}
                        <span className="font-medium text-foreground">
                            {agentName}
                        </span>
                        . Su agente responde las tareas de tipo «Hablar».
                    </p>
                ) : null}

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium tabular-nums">
                            {doneCount}/{total}
                        </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>

                {isComplete ? (
                    <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                        <GraduationCap className="size-6 text-primary" />
                        <div>
                            <p className="font-medium">
                                ¡Onboarding completado!
                            </p>
                            <p className="text-muted-foreground text-sm">
                                Terminaste todas las tareas. Ya conoces el rol.
                            </p>
                        </div>
                    </div>
                ) : null}
            </header>

            <div className="space-y-4">
                {plan.days.map((day, i) => (
                    <Card key={`${day.title}-${i}`}>
                        <CardHeader>
                            <CardTitle className="text-base">
                                <span className="text-muted-foreground">
                                    Día {i + 1}
                                </span>{" "}
                                · {day.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {day.tasks.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    checked={done.has(task.id)}
                                    disabled={toggle.isPending}
                                    onToggle={() =>
                                        toggle.mutate({
                                            planId: plan.id,
                                            taskId: task.id,
                                        })
                                    }
                                    onTalk={
                                        task.type === "talk"
                                            ? () => setChatSeed(task.title)
                                            : undefined
                                    }
                                    agentName={agentName}
                                />
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Sheet
                open={chatSeed !== null}
                onOpenChange={(open) => !open && setChatSeed(null)}
            >
                <SheetContent className="flex w-full flex-col gap-4 sm:max-w-md">
                    <SheetHeader className="space-y-1">
                        <SheetTitle>
                            Agente de {agentName ?? "la empresa"}
                        </SheetTitle>
                        <SheetDescription>
                            Responde desde el historial real de cómo se trabaja
                            aquí, citando fuentes internas.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 px-4 pb-4">
                        {chatSeed !== null ? (
                            <PersonAgentChat
                                personId={plan.benchmarkPersonId}
                                personName={agentName}
                                seed={chatSeed}
                            />
                        ) : null}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

function TaskRow({
    task,
    checked,
    disabled,
    onToggle,
    onTalk,
    agentName,
}: {
    task: OnboardingTask;
    checked: boolean;
    disabled: boolean;
    onToggle: () => void;
    onTalk?: () => void;
    agentName: string | null;
}) {
    const meta = TASK_META[task.type];
    const Icon = meta.icon;

    return (
        <div className="flex gap-3 rounded-lg border p-3">
            <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={onToggle}
                className="mt-1"
                aria-label={`Marcar «${task.title}» como hecha`}
            />
            <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                        <Icon className="size-3" />
                        {meta.label}
                    </Badge>
                    <span
                        className={cn(
                            "font-medium text-sm",
                            checked && "text-muted-foreground line-through",
                        )}
                    >
                        {task.title}
                    </span>
                </div>
                <p className="text-muted-foreground text-sm">{task.detail}</p>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <Badge variant="outline" className="font-normal">
                        Competencia: {task.competency}
                    </Badge>
                    {onTalk ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-primary"
                            onClick={onTalk}
                        >
                            <MessagesSquare className="size-3.5" />
                            Preguntar al agente de {agentName ?? "la empresa"}
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
