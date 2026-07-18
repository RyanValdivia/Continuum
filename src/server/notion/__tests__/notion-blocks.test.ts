import { describe, expect, it } from "vitest";
import { blocksToPlainText, type NotionBlock } from "../notion-api";

describe("blocksToPlainText", () => {
    it("joins rich_text across heterogeneous block types, one line each", () => {
        const blocks: NotionBlock[] = [
            {
                type: "heading_1",
                heading_1: { rich_text: [{ plain_text: "Decisión" }] },
            },
            {
                type: "paragraph",
                paragraph: {
                    rich_text: [
                        { plain_text: "Elegimos " },
                        { plain_text: "Postgres." },
                    ],
                },
            },
            {
                type: "bulleted_list_item",
                bulleted_list_item: {
                    rich_text: [{ plain_text: "Integridad relacional" }],
                },
            },
        ];
        expect(blocksToPlainText(blocks)).toBe(
            "Decisión\nElegimos Postgres.\nIntegridad relacional",
        );
    });

    it("skips blocks with no rich_text or only whitespace", () => {
        const blocks: NotionBlock[] = [
            { type: "divider", divider: {} },
            {
                type: "paragraph",
                paragraph: { rich_text: [{ plain_text: "  " }] },
            },
            { type: "image", image: {} },
            {
                type: "paragraph",
                paragraph: { rich_text: [{ plain_text: "real" }] },
            },
        ];
        expect(blocksToPlainText(blocks)).toBe("real");
    });

    it("returns empty string for no blocks", () => {
        expect(blocksToPlainText([])).toBe("");
    });
});
