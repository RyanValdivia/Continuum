"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { OnboardingTarget } from "@/core/onboarding/domain/types";
import { Button } from "@/frontend/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/frontend/components/ui/select";
import { Spinner } from "@/frontend/components/ui/spinner";
import { useOnboarding } from "../hooks";

const NO_PREDECESSOR = "__none__";

/**
 * First run: the new hire picks the role they step into. Choosing a predecessor
 * scopes the generated plan (and every "talk" task) to that person's captured
 * knowledge. Generation grounds Gemini on the role's real graph digest.
 */
export function OnboardingEmptyState({
    targets,
}: {
    targets: OnboardingTarget[];
}) {
    const { useGeneratePlan } = useOnboarding();
    const generate = useGeneratePlan();

    const [personId, setPersonId] = useState<string>(NO_PREDECESSOR);
    const [roleTitle, setRoleTitle] = useState("");

    const predecessor = targets.find((t) => t.personId === personId) ?? null;

    const onPick = (value: string) => {
        setPersonId(value);
        const target = targets.find((t) => t.personId === value);
        if (target && !roleTitle.trim()) setRoleTitle(target.role);
    };

    const submit = () => {
        const title = roleTitle.trim();
        if (!title || generate.isPending) return;
        generate.mutate({
            roleTitle: title,
            benchmarkPersonId: predecessor ? predecessor.personId : null,
            benchmarkPersonName: predecessor ? predecessor.name : null,
        });
    };

    return (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-semibold text-2xl">Bienvenido a bordo</h1>
                <p className="text-muted-foreground">
                    Genera tu onboarding a partir del conocimiento real del
                    puesto. Elige a quién sucedes y armamos tu plan día a día.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="size-5 text-primary" />
                        Arma mi onboarding
                    </CardTitle>
                    <CardDescription>
                        La IA usa las decisiones y procesos capturados del rol —
                        no una plantilla genérica.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="predecessor">¿A quién sucedes?</Label>
                        <Select value={personId} onValueChange={onPick}>
                            <SelectTrigger id="predecessor">
                                <SelectValue placeholder="Elige una persona" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_PREDECESSOR}>
                                    Sin predecesor (rol nuevo)
                                </SelectItem>
                                {targets.map((t) => (
                                    <SelectItem
                                        key={t.personId}
                                        value={t.personId}
                                    >
                                        {t.name} · {t.role}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="role">Título del rol</Label>
                        <Input
                            id="role"
                            value={roleTitle}
                            onChange={(e) => setRoleTitle(e.target.value)}
                            placeholder="Ej: Product Designer"
                        />
                    </div>

                    {generate.isError ? (
                        <p className="text-destructive text-sm">
                            No se pudo generar el plan. Inténtalo de nuevo.
                        </p>
                    ) : null}

                    <Button
                        onClick={submit}
                        disabled={!roleTitle.trim() || generate.isPending}
                        className="self-start"
                    >
                        {generate.isPending ? (
                            <>
                                <Spinner className="size-4" />
                                Generando plan…
                            </>
                        ) : (
                            "Generar mi onboarding"
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
