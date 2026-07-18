import { describe, expect, it } from "vitest";
import { buildRoleDigest } from "../digest";

describe("buildRoleDigest", () => {
    it("renders nodes and chunks into a labelled digest", () => {
        const digest = buildRoleDigest({
            nodes: [
                {
                    type: "decision",
                    label: "Usar Postgres",
                    summary: "Integridad relacional",
                },
                {
                    type: "process",
                    label: "Weekly design review",
                    summary: null,
                },
            ],
            chunks: [{ content: "María lidera el design system." }],
        });

        expect(digest).toContain(
            "- decision: Usar Postgres — Integridad relacional",
        );
        expect(digest).toContain("- process: Weekly design review");
        expect(digest).toContain("- María lidera el design system.");
    });

    it("falls back to a sentinel when nothing was retrieved", () => {
        const digest = buildRoleDigest({ nodes: [], chunks: [] });
        expect(digest.length).toBeGreaterThan(0);
        expect(digest).not.toContain("- ");
    });
});
