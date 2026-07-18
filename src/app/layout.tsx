import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { PropsWithChildren } from "react";
import { Providers } from "@/frontend/providers/providers";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Continuum — La memoria viva de la empresa",
    description:
        "Plataforma de continuidad del conocimiento. Grafo de conocimiento y un agente de IA por persona. Menos búsqueda, más continuidad.",
};

export default function RootLayout({ children }: PropsWithChildren) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body
                className={`${inter.variable} min-h-svh font-sans antialiased`}
            >
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
