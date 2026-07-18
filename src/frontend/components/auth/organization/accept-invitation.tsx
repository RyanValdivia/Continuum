"use client";

import {
    type OrganizationAuthClient,
    useAcceptInvitation,
    useAuth,
    useRejectInvitation,
} from "@better-auth-ui/react";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { Spinner } from "@/frontend/components/ui/spinner";

function errorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === "object" && "error" in error) {
        const inner = (error as { error?: { message?: string } }).error;
        if (inner?.message) return inner.message;
    }
    return fallback;
}

export function AcceptInvitation({ invitationId }: { invitationId: string }) {
    const { authClient } = useAuth();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const { mutate: accept, isPending: accepting } = useAcceptInvitation(
        authClient as OrganizationAuthClient,
    );
    const { mutate: reject, isPending: rejecting } = useRejectInvitation(
        authClient as OrganizationAuthClient,
    );
    const busy = accepting || rejecting;

    const onAccept = () => {
        setError(null);
        accept(
            { invitationId },
            {
                // Land on "/" — the home route sends members to their org app.
                onSuccess: () => router.replace("/"),
                onError: (e) =>
                    setError(
                        errorMessage(
                            e,
                            "No pudimos aceptar la invitación. Puede haber expirado o ya no ser válida.",
                        ),
                    ),
            },
        );
    };

    const onReject = () => {
        setError(null);
        reject(
            { invitationId },
            {
                onSuccess: () => router.replace("/"),
                onError: (e) =>
                    setError(
                        errorMessage(e, "No pudimos rechazar la invitación."),
                    ),
            },
        );
    };

    return (
        <Card className="mx-auto w-full max-w-md">
            <CardContent className="flex flex-col gap-5 p-6">
                <div className="space-y-1">
                    <h1 className="font-semibold text-foreground text-lg">
                        Invitación a una organización
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Te invitaron a unirte a una organización en Continuum.
                        Acepta para empezar a colaborar.
                    </p>
                </div>

                {error && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
                        {error}
                    </p>
                )}

                <div className="flex gap-3">
                    <Button onClick={onAccept} disabled={busy}>
                        {accepting ? <Spinner /> : <Check />}
                        Aceptar
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onReject}
                        disabled={busy}
                    >
                        {rejecting ? <Spinner /> : <X />}
                        Rechazar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
