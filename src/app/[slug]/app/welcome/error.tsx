"use client";

import { Button } from "@/frontend/components/ui/button";

/** Route error boundary for /welcome — the onboarding services resolve to an
 *  err branch that `resolveResult` rethrows during render. */
export default function WelcomeError({
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 p-6">
            <div className="space-y-1">
                <h2 className="font-semibold text-lg">Algo salió mal</h2>
                <p className="text-muted-foreground text-sm">
                    No pudimos cargar tu onboarding. Inténtalo de nuevo.
                </p>
            </div>
            <Button onClick={reset}>Reintentar</Button>
        </div>
    );
}
