import { useRouter } from "next/navigation";
import { Button } from "@/frontend/components/ui/button";

/** Heuristic: the better-auth-ui org queries run with `throwOnError`, so a 401/403
 *  surfaces as a thrown Error whose message carries the status text. */
const AUTH_ERROR = /forbidden|unauthorized|401|403/i;

type RouteErrorProps = {
    error: Error;
    reset: () => void;
    title: string;
    description: string;
};

/**
 * Shared route error boundary UI. When the failure looks like an auth/permission
 * error it offers sign-in (a retry would just fail again); otherwise it retries.
 */
export function RouteError({ error, reset, title, description }: RouteErrorProps) {
    const router = useRouter();
    const isAuthError = AUTH_ERROR.test(error.message);

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 p-6">
            <div className="space-y-1">
                <h2 className="font-semibold text-lg">
                    {isAuthError ? "Necesitas iniciar sesión" : title}
                </h2>
                <p className="text-muted-foreground text-sm">
                    {isAuthError
                        ? "Tu sesión expiró o no tienes acceso. Inicia sesión para continuar."
                        : description}
                </p>
            </div>
            {isAuthError ? (
                <Button onClick={() => router.push("/auth/sign-in")}>
                    Iniciar sesión
                </Button>
            ) : (
                <Button onClick={reset}>Reintentar</Button>
            )}
        </div>
    );
}
