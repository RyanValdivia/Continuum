import { describe, expect, it } from "vitest";
import { collectSources, type SourceDoc } from "../sources";

const docs = new Map<string, SourceDoc>([
    ["doc1", { id: "doc1", title: "Runbook", url: "http://x" }],
    ["doc2", { id: "doc2", title: "Notas", url: null }],
]);

describe("collectSources", () => {
    it("returns distinct cited documents in first-cited order", () => {
        const sources = collectSources(
            [
                { documentId: "doc2" },
                { documentId: "doc1" },
                { documentId: "doc2" },
            ],
            docs,
        );
        expect(sources).toEqual([
            { title: "Notas", url: null },
            { title: "Runbook", url: "http://x" },
        ]);
    });

    it("skips chunks whose document is unknown", () => {
        const sources = collectSources(
            [{ documentId: "ghost" }, { documentId: "doc1" }],
            docs,
        );
        expect(sources).toEqual([{ title: "Runbook", url: "http://x" }]);
    });

    it("is empty when there are no chunks", () => {
        expect(collectSources([], docs)).toEqual([]);
    });
});
