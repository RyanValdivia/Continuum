"use client";

import { Button } from "@/frontend/components/ui/button";

/**
 * Route error boundary for /settings. The better-auth-ui organization queries
 * run with `throwOnError: true` on the shared QueryClient, so a failed
 * request (e.g. a permissions error) throws during render instead of just
 * setting an error state. This boundary catches that and offers a retry
 * instead of white-screening.
 */
export default function SettingsError({
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 p-6">
            <div className="space-y-1">
                <h2 className="font-semibold text-lg">Something went wrong</h2>
                <p className="text-muted-foreground text-sm">
                    We couldn’t load your settings. Please try again.
                </p>
            </div>
            <Button onClick={reset}>Retry</Button>
        </div>
    );
}
