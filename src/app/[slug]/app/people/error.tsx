"use client";

import { RouteError } from "@/frontend/components/auth/route-error";

export default function PeopleError({
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
            description="No pudimos cargar las personas. Inténtalo de nuevo."
        />
    );
}
