import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";

const LINKS = [
    { href: "#problema", label: "El problema" },
    { href: "#como-funciona", label: "Cómo funciona" },
    { href: "#competencia", label: "Competencia" },
];

export function LandingNav() {
    return (
        <header className="sticky top-0 z-50 border-border/60 border-b bg-background/70 backdrop-blur-md">
            <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                <Link
                    href="/"
                    className="flex items-center gap-2 font-semibold text-foreground tracking-tight"
                >
                    <span className="size-2.5 rounded-full bg-primary" />
                    Continuum
                </Link>

                <div className="hidden items-center gap-8 md:flex">
                    {LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                <Button asChild size="sm">
                    <Link href="/auth/sign-in">Iniciar sesión</Link>
                </Button>
            </nav>
        </header>
    );
}
