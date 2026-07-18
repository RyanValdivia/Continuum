import { describe, expect, it } from "vitest";
import type { SearchResult } from "@/core/knowledge/domain/types";
import { buildSystemPrompt, latestUserText } from "../build-context";

describe("latestUserText", () => {
    it("returns the most recent user turn's concatenated text", () => {
        const text = latestUserText([
            { role: "user", parts: [{ type: "text", text: "first" }] },
            { role: "assistant", parts: [{ type: "text", text: "reply" }] },
            {
                role: "user",
                parts: [
                    { type: "text", text: "how did" },
                    { type: "text", text: "we deploy?" },
                ],
            },
        ]);
        expect(text).toBe("how did we deploy?");
    });

    it("ignores non-text parts and returns empty when no user message", () => {
        expect(latestUserText([])).toBe("");
        expect(
            latestUserText([
                { role: "assistant", parts: [{ type: "text", text: "hi" }] },
            ]),
        ).toBe("");
    });
});

const result = (over: Partial<SearchResult> = {}): SearchResult => ({
    query: "why postgres",
    chunks: [
        {
            id: "c1",
            documentId: "doc1",
            personId: null,
            content: "We chose Postgres for relational integrity.",
            ord: 0,
            score: 0.9,
        },
    ],
    nodes: [
        {
            id: "n1",
            personId: null,
            type: "decision",
            label: "Use Postgres",
            summary: "Relational needs outweighed Firebase's speed.",
            sourceChunkId: "c1",
            origin: "sync",
            confidence: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            score: 0.8,
        },
    ],
    edges: [],
    ...over,
});

describe("buildSystemPrompt", () => {
    it("numbers chunks as citable sources and lists structured knowledge", () => {
        const prompt = buildSystemPrompt(result());
        expect(prompt).toContain("[1] (doc doc1) We chose Postgres");
        expect(prompt).toContain("decision: Use Postgres — Relational needs");
        expect(prompt).toContain("Cite sources inline");
    });

    it("degrades gracefully with no retrieval hits", () => {
        const prompt = buildSystemPrompt(result({ chunks: [], nodes: [] }));
        expect(prompt).toContain("Retrieved sources: (none)");
        expect(prompt).toContain("Structured knowledge: (none)");
    });
});
