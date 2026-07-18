"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Sparkles } from "lucide-react";
import { type KeyboardEvent, useMemo, useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Textarea } from "@/frontend/components/ui/textarea";
import { cn } from "@/frontend/lib/utils";

function messageText(parts: { type: string; text?: string }[]): string {
    return parts
        .filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join("");
}

/**
 * Streaming chat scoped to one person's captured knowledge. Same endpoint and
 * grounding as the org chat, but the transport carries a `personId` so
 * retrieval is filtered to that predecessor — "talk to María's agent".
 */
export function PersonAgentChat({
    personId,
    personName,
    seed,
}: {
    personId: string | null;
    personName: string | null;
    /** Optional first question prefilled from the task detail. */
    seed?: string;
}) {
    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: "/api/v1/knowledge/chat",
                body: personId ? { personId } : undefined,
            }),
        [personId],
    );

    const [input, setInput] = useState(seed ?? "");
    const { messages, sendMessage, status } = useChat({ transport });
    const busy = status === "submitted" || status === "streaming";

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

    const who = personName ?? "la empresa";

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto pb-4">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                        <Sparkles className="size-8" />
                        <p className="max-w-xs text-sm">
                            Pregúntale al agente de {who} sobre las decisiones y
                            el porqué detrás del trabajo. Cita fuentes internas.
                        </p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex",
                                message.role === "user"
                                    ? "justify-end"
                                    : "justify-start",
                            )}
                        >
                            <div
                                className={cn(
                                    "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                                    message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-foreground",
                                )}
                            >
                                {messageText(message.parts) ||
                                    (busy ? "…" : "")}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    send();
                }}
                className="flex items-end gap-2 border-t pt-3"
            >
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={`Pregunta al agente de ${who}…`}
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
