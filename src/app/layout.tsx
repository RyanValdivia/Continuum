import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import type { PropsWithChildren } from "react";
import { Providers } from "@/frontend/providers/providers";
import "./globals.css";

/** Body + UI. */
const geist = Geist({
    subsets: ["latin"],
    variable: "--font-geist",
    display: "swap",
});

/** Display — Lumen's classical technical-journal serif. Upright, never italic. */
const instrumentSerif = Instrument_Serif({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-instrument-serif",
    display: "swap",
});

/** Label register — eyebrows, callouts, meter readouts, tabular data. */
const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Continuum — el grafo de conocimiento de tu empresa",
    description:
        "Continuum construye el grafo de conocimiento de tu empresa: personas, decisiones, documentos y criterio conectados en una sola estructura viva.",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default function RootLayout({ children }: PropsWithChildren) {
    return (
        <html lang="es" suppressHydrationWarning>
            <head>
                {/* react-grab — hover an element, press ⌘C, and the file, the
                    React component and the source land on the clipboard for an
                    agent. Development only; never shipped to production. */}
                {process.env.NODE_ENV === "development" && (
                    <Script
                        src="//unpkg.com/react-grab/dist/index.global.js"
                        crossOrigin="anonymous"
                        strategy="beforeInteractive"
                    />
                )}
            </head>
            <body
                className={`${geist.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} min-h-svh font-sans antialiased`}
            >
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
