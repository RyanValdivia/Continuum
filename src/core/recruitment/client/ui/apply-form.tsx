"use client";

import { useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/frontend/components/ui/field";
import { Input } from "@/frontend/components/ui/input";

type SubmitState =
    | { kind: "idle" }
    | { kind: "submitting" }
    | { kind: "done" }
    | { kind: "error"; message: string };

/**
 * Plain fetch + FormData (multipart) — the Eden proxy is for authed app
 * routes; this public endpoint takes a file, so a native form post is the
 * simple correct tool. The `website` field is a honeypot: invisible to
 * humans, irresistible to bots.
 */
export function ApplyForm({ token }: { token: string }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [cv, setCv] = useState<File | null>(null);
    const [website, setWebsite] = useState("");
    const [state, setState] = useState<SubmitState>({ kind: "idle" });

    if (state.kind === "done") {
        return (
            <div className="rounded-lg border p-6 text-center">
                <p className="font-medium">¡Aplicación recibida!</p>
                <p className="text-muted-foreground text-sm">
                    Gracias por postularte. Te contactaremos pronto.
                </p>
            </div>
        );
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cv) return;
        setState({ kind: "submitting" });

        const form = new FormData();
        form.set("name", name);
        form.set("email", email);
        form.set("cv", cv);
        form.set("website", website);

        try {
            const res = await fetch(`/api/v1/recruitment/apply/${token}`, {
                method: "POST",
                body: form,
            });
            if (res.ok) {
                setState({ kind: "done" });
                return;
            }
            const message =
                res.status === 409
                    ? "Ya existe una aplicación con este email para esta vacante."
                    : res.status === 422
                      ? "No pudimos leer tu CV. Intenta con otro PDF."
                      : res.status === 429
                        ? "Esta vacante ya no acepta más aplicaciones."
                        : "No pudimos procesar tu aplicación. Intenta de nuevo.";
            setState({ kind: "error", message });
        } catch {
            setState({
                kind: "error",
                message: "Error de red. Intenta de nuevo.",
            });
        }
    };

    const ready = name.trim() !== "" && email.trim() !== "" && cv !== null;

    return (
        <form onSubmit={submit} className="space-y-4">
            <Field>
                <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </Field>
            <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </Field>
            <Field>
                <FieldLabel htmlFor="cv">CV (PDF, máx. 5 MB)</FieldLabel>
                <Input
                    id="cv"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setCv(e.target.files?.[0] ?? null)}
                    required
                />
            </Field>
            {/* Honeypot — keep out of sight and out of the tab order. */}
            <div
                aria-hidden
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
            >
                <label htmlFor="website">Website</label>
                <input
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                />
            </div>
            {state.kind === "error" && <FieldError>{state.message}</FieldError>}
            <Button
                type="submit"
                disabled={!ready || state.kind === "submitting"}
                className="w-full"
            >
                {state.kind === "submitting"
                    ? "Enviando…"
                    : "Enviar aplicación"}
            </Button>
        </form>
    );
}
