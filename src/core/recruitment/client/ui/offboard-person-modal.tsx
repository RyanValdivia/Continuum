"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
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
import { useAppForm } from "@/frontend/hooks/use-tanstack-form";
import { useRecruitment } from "../hooks";
import { offboardFormSchema } from "../validation";

function getFieldErrors(field: AnyFieldApi) {
    return field.state.meta.errors.map((error) => ({
        message: String(error?.message ?? error),
    }));
}

export function OffboardPersonModal({
    memberId,
    memberName,
    open,
    onOpenChange,
}: {
    memberId: string;
    memberName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { useOffboard } = useRecruitment();
    const offboard = useOffboard(memberId);

    const form = useAppForm({
        defaultValues: { title: "" },
        validators: { onChange: offboardFormSchema },
        onSubmit: async ({ value }) => {
            await offboard.mutateAsync(value);
            onOpenChange(false);
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Marcar salida de {memberName}</DialogTitle>
                    <DialogDescription>
                        Su nodo del grafo se convierte en la vacante. Todo su
                        conocimiento y su agente se preservan.
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
                                    <Label htmlFor={field.name}>
                                        Título de la vacante
                                    </Label>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        placeholder="Ej. Backend Senior"
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
                                    disabled={!canSubmit || offboard.isPending}
                                >
                                    Marcar salida y abrir vacante
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
