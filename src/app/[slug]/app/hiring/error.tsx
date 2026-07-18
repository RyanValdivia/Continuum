"use client";

import { RouteError } from "@/frontend/components/auth/route-error";

export default function HiringError({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <RouteError
            error={error}
            reset={reset}
            title="Algo salió mal"
            description="No pudimos cargar las vacantes. Inténtalo de nuevo."
        />
    );
}
