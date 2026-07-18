"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Brain, FileText, Send } from "lucide-react";
import { type KeyboardEvent, useMemo, useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Textarea } from "@/frontend/components/ui/textarea";
import { cn } from "@/frontend/lib/utils";

/** Text of a message, joining its text parts. */
function messageText(parts: { type: string; text?: string }[]): string {
    return parts
        .filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join("");
}

type ChatSource = { title: string; url: string | null };

/** The cited-source cards streamed as a `data-sources` part, if any. */
function messageSources(
    parts: { type: string; data?: unknown }[],
): ChatSource[] {
    const part = parts.find((p) => p.type === "data-sources");
    return part && Array.isArray(part.data) ? (part.data as ChatSource[]) : [];
}

/**
 * Streaming chat with the organization's knowledge agent. Answers are grounded
 * on retrieved knowledge (server-side) and cite their sources. When `personId`
 * is set, retrieval is scoped to that person — "the agent of {personName}".
 * No history is persisted — the conversation lives in the client for the session.
 */
export function KnowledgeChat({
    personId,
    personName,
}: {
    personId?: string;
    personName?: string;
} = {}) {
    const [input, setInput] = useState("");
    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: "/api/v1/knowledge/chat",
                body: personId ? { personId } : undefined,
            }),
        [personId],
    );
    const { messages, sendMessage, status } = useChat({ transport });

    const busy = status === "submitted" || status === "streaming";
    const scoped = Boolean(personId && personName);

    const send = () => {
        const text = input.trim();
        if (!text || busy) return;
        sendMessage({ text });
        setInput("");
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
        }
    };

    return (
        <div className="mx-auto flex h-[calc(100svh-4rem)] w-full max-w-3xl flex-col p-6">
            {scoped && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                    <Brain className="size-4 text-primary" />
                    <span>
                        Hablando con el agente de{" "}
                        <span className="font-medium">{personName}</span> — las
                        respuestas se basan solo en su conocimiento.
                    </span>
                </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto pb-4">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                        <Brain className="size-10" />
                        <div>
                            <p className="font-medium text-foreground">
                                {scoped
                                    ? `Pregúntale al agente de ${personName}`
                                    : "Pregúntale a la memoria de la organización"}
                            </p>
                            <p className="text-sm">
                                Ej: «¿Cómo se decidió migrar de Firebase?» ·
                                «¿Cuál es el proceso de onboarding?»
                            </p>
                        </div>
                    </div>
                ) : (
                    messages.map((message) => {
                        const sources =
                            message.role === "user"
                                ? []
                                : messageSources(message.parts);
                        return (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex",
                                    message.role === "user"
                                        ? "justify-end"
                                        : "justify-start",
                                )}
                            >
                                <div className="flex max-w-[80%] flex-col gap-1.5">
                                    <div
                                        className={cn(
                                            "whitespace-pre-wrap rounded-lg px-4 py-2 text-sm",
                                            message.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-foreground",
                                        )}
                                    >
                                        {messageText(message.parts) ||
                                            (busy ? "…" : "")}
                                    </div>
                                    {sources.length > 0 && (
                                        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                                            <p className="mb-1 font-medium text-muted-foreground">
                                                Fuentes
                                            </p>
                                            <ul className="space-y-0.5">
                                                {sources.map((s, i) => (
                                                    <li
                                                        key={`${s.title}-${i}`}
                                                        className="flex items-center gap-1.5"
                                                    >
                                                        <FileText className="size-3 shrink-0 text-muted-foreground" />
                                                        {s.url ? (
                                                            <a
                                                                href={s.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="truncate hover:underline"
                                                            >
                                                                {s.title}
                                                            </a>
                                                        ) : (
                                                            <span className="truncate">
                                                                {s.title}
                                                            </span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    send();
                }}
                className="flex items-end gap-2 border-t pt-4"
            >
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Escribe tu pregunta…"
                    rows={1}
                    className="max-h-40 min-h-11 resize-none"
                    disabled={busy}
                />
                <Button
                    type="submit"
                    size="icon"
                    disabled={busy || !input.trim()}
                >
                    <Send className="size-4" />
                    <span className="sr-only">Enviar</span>
                </Button>
            </form>
        </div>
    );
}
