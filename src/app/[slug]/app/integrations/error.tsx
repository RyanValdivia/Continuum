"use client";

import { Button } from "@/frontend/components/ui/button";

/**
 * Route error boundary for /integrations. See /settings/error.tsx — same
 * throwOnError-on-render hazard, here from the Notion status/pages queries.
 */
export default function IntegrationsError({
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
                    We couldn’t load your integrations. Please try again.
                </p>
            </div>
            <Button onClick={reset}>Retry</Button>
        </div>
    );
}
