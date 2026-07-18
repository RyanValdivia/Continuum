import { describe, expect, it } from "vitest";
import {
    documentReviewSchema,
    documentReviewSearchSchema,
    reviewDocumentSchema,
} from "../schemas";

describe("reviewDocumentSchema", () => {
    it("accepts a status with an optional note", () => {
        const parsed = reviewDocumentSchema.parse({
            reviewStatus: "approved",
            note: "Looks good",
        });
        expect(parsed.reviewStatus).toBe("approved");
        expect(parsed.note).toBe("Looks good");
    });

    it("allows omitting the note", () => {
        expect(
            reviewDocumentSchema.safeParse({ reviewStatus: "rejected" })
                .success,
        ).toBe(true);
    });

    it("rejects pending as an action status", () => {
        expect(
            reviewDocumentSchema.safeParse({ reviewStatus: "pending" }).success,
        ).toBe(false);
    });

    it("rejects a note over 2000 characters", () => {
        expect(
            reviewDocumentSchema.safeParse({
                reviewStatus: "flagged",
                note: "x".repeat(2001),
            }).success,
        ).toBe(false);
    });
});

describe("documentReviewSchema", () => {
    it("requires ISO string timestamps and allows nullable review fields", () => {
        const ok = documentReviewSchema.safeParse({
            id: "d1",
            organizationId: "o1",
            personId: null,
            connector: "notion",
            title: "Onboarding guide",
            url: null,
            reviewStatus: "pending",
            reviewedBy: null,
            reviewedAt: null,
            reviewNote: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        });
        expect(ok.success).toBe(true);
    });
});

describe("documentReviewSearchSchema", () => {
    it("normalizes a single reviewStatus value into a 1-element array", () => {
        expect(
            documentReviewSearchSchema.parse({ reviewStatus: "approved" })
                .reviewStatus,
        ).toEqual(["approved"]);
    });

    it("passes an array of connectors through unchanged", () => {
        expect(
            documentReviewSearchSchema.parse({
                connector: ["notion", "manual"],
            }).connector,
        ).toEqual(["notion", "manual"]);
    });

    it("defaults facets to empty arrays when missing", () => {
        const parsed = documentReviewSearchSchema.parse({});
        expect(parsed.reviewStatus).toEqual([]);
        expect(parsed.connector).toEqual([]);
    });

    it("degrades an invalid reviewStatus to an empty array instead of throwing", () => {
        expect(
            documentReviewSearchSchema.parse({ reviewStatus: "bogus" })
                .reviewStatus,
        ).toEqual([]);
    });

    it("parses a JSON-encoded sort string", () => {
        expect(
            documentReviewSearchSchema.parse({
                sort: '[{"id":"title","desc":true}]',
            }).sort,
        ).toEqual([{ id: "title", desc: true }]);
    });

    it("degrades a sort with an unknown column to an empty array", () => {
        expect(
            documentReviewSearchSchema.parse({
                sort: '[{"id":"evil","desc":true}]',
            }).sort,
        ).toEqual([]);
    });

    it("coerces page/perPage from strings and applies defaults", () => {
        const parsed = documentReviewSearchSchema.parse({
            page: "3",
            perPage: "50",
        });
        expect(parsed.page).toBe(3);
        expect(parsed.perPage).toBe(50);

        const defaults = documentReviewSearchSchema.parse({});
        expect(defaults.page).toBe(1);
        expect(defaults.perPage).toBe(20);
    });

    it("trims title", () => {
        expect(
            documentReviewSearchSchema.parse({ title: "  guide  " }).title,
        ).toBe("guide");
    });
});
