import Link from "next/link";

export function LandingFooter() {
    return (
        <footer className="border-border/60 border-t">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
                <Link
                    href="/"
                    className="flex items-center gap-2 font-semibold text-foreground tracking-tight"
                >
                    <span className="size-2.5 rounded-full bg-primary" />
                    Continuum
                </Link>

                <p className="text-muted-foreground text-sm">
                    La memoria viva de la empresa.
                </p>

                <div className="flex items-center gap-6 text-muted-foreground text-sm">
                    <a
                        href="#como-funciona"
                        className="transition-colors hover:text-foreground"
                    >
                        Cómo funciona
                    </a>
                    <Link
                        href="/auth/sign-in"
                        className="transition-colors hover:text-foreground"
                    >
                        Iniciar sesión
                    </Link>
                </div>
            </div>
        </footer>
    );
}
