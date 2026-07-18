"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Button } from "@/frontend/components/ui/button";
import { Field, FieldError } from "@/frontend/components/ui/field";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import { useAppForm } from "@/frontend/hooks/use-tanstack-form";
import type { ReviewActionStatus } from "../../../domain/types";
import { type ReviewFormValues, reviewFormSchema } from "../../validation";

function _reviewForm() {
    // biome-ignore lint/correctness/useHookAtTopLevel: only used for its return type
    return useAppForm({
        defaultValues: { reviewStatus: "approved", note: "" } as ReviewFormValues,
        validators: { onChange: reviewFormSchema },
        onSubmit: async () => {},
    });
}

export type ReviewFormApiType = ReturnType<typeof _reviewForm>;

function getFieldErrors(field: AnyFieldApi) {
    return field.state.meta.errors.map((error) => ({
        message: String(error?.message ?? error),
    }));
}

const STATUS_OPTIONS: { value: ReviewActionStatus; label: string }[] = [
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "flagged", label: "Flagged" },
];

interface ReviewFormUIProps {
    form: ReviewFormApiType;
    disabled?: boolean;
}

function ReviewFormUI({ form, disabled }: ReviewFormUIProps) {
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
            }}
            className="space-y-4"
        >
            <form.Field name="reviewStatus">
                {(field) => (
                    <Field>
                        <Label htmlFor={field.name}>Status</Label>
                        <select
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                                field.handleChange(
                                    e.target.value as ReviewActionStatus,
                                )
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
            </form.Field>

            <form.Field name="note">
                {(field) => {
                    const hasError = !field.state.meta.isValid;
                    return (
                        <Field data-invalid={hasError}>
                            <Label htmlFor={field.name}>Note</Label>
                            <Textarea
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                rows={3}
                                placeholder="Optional reviewer note"
                                aria-invalid={hasError}
                            />
                            {hasError && (
                                <FieldError errors={getFieldErrors(field)} />
                            )}
                        </Field>
                    );
                }}
            </form.Field>

            <form.Subscribe selector={(state) => state.canSubmit}>
                {(canSubmit) => (
                    <Button
                        type="submit"
                        disabled={disabled || !canSubmit}
                        className="w-full"
                    >
                        {disabled ? "Saving…" : "Save"}
                    </Button>
                )}
            </form.Subscribe>
        </form>
    );
}

interface ReviewFormProps {
    /** Seed values — the modal pre-fills `reviewStatus` from the row action
     *  that opened it (Approve/Reject/Flag). */
    defaultValues: ReviewFormValues;
    /** Receives the validated form values on submit. */
    onSubmit: (values: ReviewFormValues) => void | Promise<void>;
    disabled?: boolean;
}

/**
 * Review form for a document: status + optional note. Validates client-side
 * via {@link reviewFormSchema} and hands the validated {@link ReviewFormValues}
 * to `onSubmit`.
 */
export function ReviewForm({
    defaultValues,
    onSubmit,
    disabled,
}: ReviewFormProps) {
    const form = useAppForm({
        defaultValues,
        validators: { onChange: reviewFormSchema },
        onSubmit: async ({ value }) => {
            await onSubmit(value);
        },
    });

    return <ReviewFormUI form={form} disabled={disabled} />;
}
