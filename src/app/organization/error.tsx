"use client";

import { RouteError } from "@/frontend/components/auth/route-error";

/**
 * Route error boundary for /organization. See /settings/error.tsx — same
 * throwOnError-on-render hazard from the better-auth-ui organization queries.
 */
export default function OrganizationError({
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
            description="No pudimos cargar esta organización. Inténtalo de nuevo."
        />
    );
}
