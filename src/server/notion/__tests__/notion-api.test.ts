import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveMissingParents, searchNotionAll } from "../notion-api";

function jsonResponse(body: unknown, ok = true) {
    return {
        ok,
        status: ok ? 200 : 404,
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as Response;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("resolveMissingParents", () => {
    it("leaves items alone when every parent is already present", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const root = {
            id: "root",
            object: "page" as const,
            url: "https://notion.so/root",
            title: "Root",
            parentId: null,
            parentType: null,
            iconEmoji: null,
            iconUrl: null,
        };
        const child = {
            ...root,
            id: "child",
            parentId: "root",
            parentType: "page" as const,
        };

        const result = await resolveMissingParents("token", [root, child]);

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result).toHaveLength(2);
    });

    it("fetches a missing database parent and includes it in the result", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({
                id: "db_1",
                object: "database",
                url: "https://notion.so/db_1",
                title: [{ plain_text: "Contacts" }],
                parent: { type: "workspace", workspace: true },
                icon: null,
            }),
        );
        vi.stubGlobal("fetch", fetchMock);

        const row = {
            id: "row_1",
            object: "page" as const,
            url: "https://notion.so/row_1",
            title: "Ellen Bonet",
            parentId: "db_1",
            parentType: "database" as const,
            iconEmoji: null,
            iconUrl: null,
        };

        const result = await resolveMissingParents("token", [row]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/databases/db_1"),
            expect.anything(),
        );
        expect(result.map((r) => r.id).sort()).toEqual(["db_1", "row_1"]);
    });

    it("doesn't retry a parent that came back 404", async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false));
        vi.stubGlobal("fetch", fetchMock);

        const row1 = {
            id: "row_1",
            object: "page" as const,
            url: "https://notion.so/row_1",
            title: "A",
            parentId: "db_missing",
            parentType: "database" as const,
            iconEmoji: null,
            iconUrl: null,
        };
        const row2 = { ...row1, id: "row_2", title: "B" };

        const result = await resolveMissingParents("token", [row1, row2]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result.map((r) => r.id).sort()).toEqual(["row_1", "row_2"]);
    });
});

function searchPage(id: string, nextCursor: string | null) {
    return jsonResponse({
        results: [
            {
                id,
                object: "page",
                url: `https://notion.so/${id}`,
                title: [{ plain_text: id }],
                parent: { type: "workspace", workspace: true },
                icon: null,
            },
        ],
        next_cursor: nextCursor,
    });
}

describe("searchNotionAll", () => {
    it("follows the cursor until it's exhausted", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(searchPage("page_1", "cursor_1"))
            .mockResolvedValueOnce(searchPage("page_2", "cursor_2"))
            .mockResolvedValueOnce(searchPage("page_3", null));
        vi.stubGlobal("fetch", fetchMock);

        const items = await searchNotionAll("token");

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(items.map((i) => i.id)).toEqual(["page_1", "page_2", "page_3"]);
    });

    it("stops after a single page when there's no cursor", async () => {
        const fetchMock = vi.fn().mockResolvedValue(searchPage("page_1", null));
        vi.stubGlobal("fetch", fetchMock);

        const items = await searchNotionAll("token");

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(items).toHaveLength(1);
    });
});
