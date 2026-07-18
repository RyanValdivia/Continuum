import { describe, expect, it } from "vitest";
import {
    groupMessagesByAuthor,
    renderTranscript,
    stripHtml,
} from "../transcript";

const msg = (
    id: string,
    authorId: string | null,
    authorName: string,
    createdDateTime: string,
    body: string,
    replyToId: string | null = null,
) => ({ id, authorId, authorName, createdDateTime, body, replyToId });

describe("stripHtml", () => {
    it("removes tags and keeps text", () => {
        expect(stripHtml("<p>hello <b>world</b></p>")).toBe("hello world");
    });

    it("turns block boundaries into newlines", () => {
        expect(stripHtml("<p>a</p><p>b</p>")).toBe("a\nb");
        expect(stripHtml("a<br>b")).toBe("a\nb");
    });

    it("decodes common entities", () => {
        expect(stripHtml("a &amp; b &lt;ok&gt; &quot;q&quot;")).toBe(
            'a & b <ok> "q"',
        );
    });

    it("passes plain text through untouched", () => {
        expect(stripHtml("just text")).toBe("just text");
    });
});

describe("renderTranscript", () => {
    const messages = [
        msg("m1", "u1", "Jane Doe", "2026-07-18T10:00:00Z", "first"),
        msg("m2", "u2", "Bob", "2026-07-18T10:05:00Z", "<p>second</p>", "m1"),
    ];

    it("renders author, email and timestamp headers with plain-text bodies", () => {
        const emails = new Map([
            ["u1", "jane@corp.com"],
            ["u2", null],
        ]);
        const out = renderTranscript(messages, emails);
        expect(out).toContain("Jane Doe <jane@corp.com> — 2026-07-18 10:00");
        expect(out).toContain("Bob — 2026-07-18 10:05 (reply)");
        expect(out).toContain("first");
        expect(out).toContain("second");
        expect(out).not.toContain("<p>");
    });

    it("falls back to the display name when the author id is unknown", () => {
        const out = renderTranscript(
            [msg("m1", null, "Guest", "2026-07-18T10:00:00Z", "hi")],
            new Map(),
        );
        expect(out).toContain("Guest — 2026-07-18 10:00");
    });
});

describe("groupMessagesByAuthor", () => {
    it("keeps only authors at or above the threshold, oldest first", () => {
        const messages = [
            msg("m1", "u1", "Jane", "2026-07-18T10:00:00Z", "a"),
            msg("m2", "u2", "Bob", "2026-07-18T10:01:00Z", "b"),
            msg("m3", "u1", "Jane", "2026-07-18T10:02:00Z", "c"),
            msg("m4", "u1", "Jane", "2026-07-18T10:03:00Z", "d"),
        ];
        const groups = groupMessagesByAuthor(messages, 3);
        expect(groups).toHaveLength(1);
        expect(groups[0].authorId).toBe("u1");
        expect(groups[0].messages.map((m) => m.id)).toEqual(["m1", "m3", "m4"]);
    });

    it("groups anonymous authors by display name", () => {
        const messages = [
            msg("m1", null, "Bot", "2026-07-18T10:00:00Z", "a"),
            msg("m2", null, "Bot", "2026-07-18T10:01:00Z", "b"),
        ];
        const groups = groupMessagesByAuthor(messages, 2);
        expect(groups[0].authorId).toBeNull();
        expect(groups[0].authorName).toBe("Bot");
    });
});
