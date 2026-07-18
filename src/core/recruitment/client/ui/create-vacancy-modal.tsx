"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Sparkles } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/frontend/components/ui/dialog";
import { Field, FieldError } from "@/frontend/components/ui/field";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import { useAppForm } from "@/frontend/hooks/use-tanstack-form";
import { useRecruitment } from "../hooks";
import { createVacancyFormSchema } from "../validation";

function getFieldErrors(field: AnyFieldApi) {
    return field.state.meta.errors.map((error) => ({
        message: String(error?.message ?? error),
    }));
}

export function CreateVacancyModal({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { useCreateVacancy, useGenerateRoleDescription } = useRecruitment();
    const createVacancy = useCreateVacancy();
    const generate = useGenerateRoleDescription();

    const form = useAppForm({
        defaultValues: { title: "", description: "" },
        validators: { onChange: createVacancyFormSchema },
        onSubmit: async ({ value }) => {
            await createVacancy.mutateAsync(value);
            onOpenChange(false);
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nueva vacante</DialogTitle>
                    <DialogDescription>
                        Sin persona de referencia — la descripción del rol es el
                        benchmark con el que se comparan los CVs.
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.handleSubmit();
                    }}
                    className="space-y-4"
                >
                    <form.Field name="title">
                        {(field) => {
                            const hasError = !field.state.meta.isValid;
                            return (
                                <Field data-invalid={hasError}>
                                    <Label htmlFor={field.name}>Título</Label>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        aria-invalid={hasError}
                                    />
                                    {hasError && (
                                        <FieldError
                                            errors={getFieldErrors(field)}
                                        />
                                    )}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="description">
                        {(field) => {
                            const hasError = !field.state.meta.isValid;
                            return (
                                <Field data-invalid={hasError}>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor={field.name}>
                                            Descripción del rol
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={
                                                generate.isPending ||
                                                !form
                                                    .getFieldValue("title")
                                                    ?.trim()
                                            }
                                            onClick={async () => {
                                                const title = form
                                                    .getFieldValue("title")
                                                    ?.trim();
                                                if (!title) return;
                                                const res =
                                                    await generate.mutateAsync({
                                                        title,
                                                    });
                                                field.handleChange(
                                                    res.response.description,
                                                );
                                            }}
                                        >
                                            <Sparkles className="size-3.5" />
                                            {generate.isPending
                                                ? "Generando…"
                                                : "Generar con IA"}
                                        </Button>
                                    </div>
                                    <Textarea
                                        id={field.name}
                                        name={field.name}
                                        rows={6}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        aria-invalid={hasError}
                                    />
                                    {hasError && (
                                        <FieldError
                                            errors={getFieldErrors(field)}
                                        />
                                    )}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <DialogFooter>
                        <form.Subscribe selector={(s) => s.canSubmit}>
                            {(canSubmit) => (
                                <Button
                                    type="submit"
                                    disabled={
                                        !canSubmit || createVacancy.isPending
                                    }
                                >
                                    Crear vacante
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
