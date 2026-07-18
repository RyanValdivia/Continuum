import { describe, expect, it } from "vitest";
import { chunkText } from "../chunk";

describe("chunkText", () => {
    it("returns no chunks for empty or whitespace input", () => {
        expect(chunkText("")).toEqual([]);
        expect(chunkText("   \n\n  \t ")).toEqual([]);
    });

    it("returns a single chunk when the text fits", () => {
        const text = "One short paragraph.";
        expect(chunkText(text, { maxChars: 100 })).toEqual([text]);
    });

    it("never emits empty chunks and trims each", () => {
        const text = "First.\n\n\n\n   \n\nSecond.";
        const chunks = chunkText(text, { maxChars: 100 });
        expect(chunks.every((c) => c.length > 0 && c === c.trim())).toBe(true);
    });

    it("packs paragraphs and keeps every chunk within maxChars", () => {
        const paras = Array.from(
            { length: 10 },
            (_, i) => `Paragraph ${i} ${"x".repeat(40)}`,
        );
        const chunks = chunkText(paras.join("\n\n"), {
            maxChars: 120,
            overlap: 0,
        });
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.every((c) => c.length <= 120)).toBe(true);
    });

    it("preserves original order and content coverage", () => {
        const paras = ["alpha", "bravo", "charlie", "delta"];
        const chunks = chunkText(paras.join("\n\n"), {
            maxChars: 12,
            overlap: 0,
        });
        const joined = chunks.join(" ");
        for (const p of paras) expect(joined).toContain(p);
        expect(joined.indexOf("alpha")).toBeLessThan(joined.indexOf("delta"));
    });

    it("hard-splits a single oversized paragraph into windowed pieces", () => {
        const big = "y".repeat(500);
        const chunks = chunkText(big, { maxChars: 100, overlap: 20 });
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.every((c) => c.length <= 100)).toBe(true);
        // Windows overlap → total length exceeds the original.
        const total = chunks.reduce((n, c) => n + c.length, 0);
        expect(total).toBeGreaterThanOrEqual(big.length);
    });

    it("throws when overlap is not smaller than maxChars", () => {
        expect(() => chunkText("abc", { maxChars: 50, overlap: 50 })).toThrow();
    });
});
