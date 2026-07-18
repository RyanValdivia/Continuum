"use client";

import { RouteError } from "@/frontend/components/auth/route-error";

/**
 * Route error boundary for /settings. The better-auth-ui organization queries
 * run with `throwOnError: true`, so a failed request throws during render;
 * this boundary catches it and — for auth errors — points to sign-in.
 */
export default function SettingsError({
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
            description="No pudimos cargar tu configuración. Inténtalo de nuevo."
        />
    );
}
