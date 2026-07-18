import { describe, expect, it } from "vitest";
import {
    extractedGraphSchema,
    ingestDocumentSchema,
    searchKnowledgeSchema,
} from "../schemas";

describe("ingestDocumentSchema", () => {
    it("defaults extract to true and trims fields", () => {
        const parsed = ingestDocumentSchema.parse({
            connector: "notion",
            externalId: "  page-1 ",
            title: "  Runbook ",
            content: "Some transferable knowledge.",
        });
        expect(parsed.extract).toBe(true);
        expect(parsed.externalId).toBe("page-1");
        expect(parsed.title).toBe("Runbook");
    });

    it("accepts the microsoft connector", () => {
        const parsed = ingestDocumentSchema.parse({
            connector: "microsoft",
            externalId: "sp:drive:item",
            title: "Doc",
            content: "Some knowledge.",
        });
        expect(parsed.connector).toBe("microsoft");
    });

    it("rejects empty content and an unknown connector", () => {
        expect(
            ingestDocumentSchema.safeParse({
                connector: "notion",
                externalId: "e",
                title: "t",
                content: "   ",
            }).success,
        ).toBe(false);
        expect(
            ingestDocumentSchema.safeParse({
                connector: "discord",
                externalId: "e",
                title: "t",
                content: "hi",
            }).success,
        ).toBe(false);
    });
});

describe("searchKnowledgeSchema", () => {
    it("applies default limit and hops", () => {
        const parsed = searchKnowledgeSchema.parse({
            query: "how do we deploy",
        });
        expect(parsed.limit).toBe(8);
        expect(parsed.hops).toBe(1);
    });

    it("coerces string limit/hops and enforces bounds", () => {
        const parsed = searchKnowledgeSchema.parse({
            query: "q",
            limit: "20",
            hops: "2",
        });
        expect(parsed.limit).toBe(20);
        expect(parsed.hops).toBe(2);
        expect(
            searchKnowledgeSchema.safeParse({ query: "q", hops: 5 }).success,
        ).toBe(false);
    });
});

describe("extractedGraphSchema", () => {
    it("accepts nodes with tempIds and typed edges", () => {
        const parsed = extractedGraphSchema.parse({
            nodes: [{ tempId: "t1", type: "decision", label: "Pick Postgres" }],
            edges: [{ from: "t1", to: "t1", type: "relates_to" }],
        });
        expect(parsed.nodes).toHaveLength(1);
    });

    it("rejects an invalid node type", () => {
        expect(
            extractedGraphSchema.safeParse({
                nodes: [{ tempId: "t1", type: "person", label: "x" }],
                edges: [],
            }).success,
        ).toBe(false);
    });
});
