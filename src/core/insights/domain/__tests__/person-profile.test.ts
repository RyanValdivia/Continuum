import { describe, expect, it } from "vitest";
import { groupProfileNodes } from "../person-profile";

const node = (type: string, label: string, summary: string | null = null) => ({
    type,
    label,
    summary,
});

describe("groupProfileNodes", () => {
    it("groups know-how nodes by type with counts and items", () => {
        const groups = groupProfileNodes([
            node("decision", "Pick Postgres", "chose pg over mongo"),
            node("decision", "Deploy on Vercel"),
            node("process", "Release flow"),
            node("concept", "Idempotency"),
        ]);
        expect(groups.decisions.count).toBe(2);
        expect(groups.decisions.items).toEqual([
            { label: "Pick Postgres", summary: "chose pg over mongo" },
            { label: "Deploy on Vercel", summary: null },
        ]);
        expect(groups.processes.count).toBe(1);
        expect(groups.concepts.count).toBe(1);
    });

    it("caps items per type but keeps the full count", () => {
        const decisions = Array.from({ length: 7 }, (_, i) =>
            node("decision", `D${i}`),
        );
        const groups = groupProfileNodes(decisions, 5);
        expect(groups.decisions.count).toBe(7);
        expect(groups.decisions.items).toHaveLength(5);
    });

    it("ignores document nodes (documents come from source_documents)", () => {
        const groups = groupProfileNodes([
            node("document", "Runbook.pdf"),
            node("decision", "X"),
        ]);
        expect(groups.decisions.count).toBe(1);
        expect(groups.processes.count).toBe(0);
        expect(groups.concepts.count).toBe(0);
    });

    it("returns empty groups for a person with no knowledge", () => {
        const groups = groupProfileNodes([]);
        expect(groups.decisions).toEqual({ count: 0, items: [] });
        expect(groups.processes).toEqual({ count: 0, items: [] });
        expect(groups.concepts).toEqual({ count: 0, items: [] });
    });
});
