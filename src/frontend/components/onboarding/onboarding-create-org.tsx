"use client";

import {
    type OrganizationAuthClient,
    useAuth,
    useCreateOrganization,
} from "@better-auth-ui/react";
import { type SyntheticEvent, useEffect, useState } from "react";
import {
    SlugField,
    sanitizeSlug,
} from "@/frontend/components/auth/organization/slug-field";
import { Button } from "@/frontend/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";
import { Field, FieldError } from "@/frontend/components/ui/field";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Spinner } from "@/frontend/components/ui/spinner";

/** Reads the created organization's slug out of the mutation result. */
function createdOrgSlug(data: unknown): string | undefined {
    if (data && typeof data === "object") {
        if (
            "slug" in data &&
            typeof (data as { slug?: unknown }).slug === "string"
        ) {
            return (data as { slug: string }).slug;
        }
        if ("data" in data) {
            return createdOrgSlug((data as { data: unknown }).data);
        }
    }
    return undefined;
}

/**
 * First onboarding step: create the organization. On success the new owner is
 * sent to `/[slug]/app/onboarding` (step 2 — first ingestion). Full-page form
 * (not the settings dialog) so it reads as a welcome, not a management screen.
 */
export function OnboardingCreateOrg() {
    const { authClient, navigate } = useAuth();

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [slugEdited, setSlugEdited] = useState(false);
    const [nameError, setNameError] = useState<string>();

    const { mutate: createOrganization, isPending } = useCreateOrganization(
        authClient as OrganizationAuthClient,
        {
            onSuccess: (data) => {
                const targetSlug = createdOrgSlug(data) ?? slug;
                if (targetSlug)
                    navigate({ to: `/${targetSlug}/app/onboarding` });
            },
        },
    );

    // Keep the slug in sync with the name until the user edits it directly.
    useEffect(() => {
        if (slugEdited) return;
        setSlug(sanitizeSlug(name));
    }, [name, slugEdited]);

    const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) {
            setNameError("El nombre es obligatorio");
            return;
        }
        createOrganization({ name, slug });
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Crea tu organización</CardTitle>
                <CardDescription>
                    Es el espacio donde vive la memoria de tu empresa. Podrás
                    invitar a tu equipo después.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Field data-invalid={!!nameError}>
                        <Label htmlFor="onboarding-org-name">Nombre</Label>
                        <Input
                            id="onboarding-org-name"
                            name="name"
                            autoFocus
                            required
                            placeholder="Acme Inc."
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setNameError(undefined);
                            }}
                            aria-invalid={!!nameError}
                            disabled={isPending}
                        />
                        <FieldError>{nameError}</FieldError>
                    </Field>

                    <SlugField
                        id="onboarding-org-slug"
                        value={slug}
                        onChange={(value) => {
                            setSlug(value);
                            setSlugEdited(true);
                        }}
                        disabled={isPending}
                    />

                    <Button type="submit" disabled={isPending} className="mt-2">
                        {isPending && <Spinner />}
                        Crear y continuar
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
