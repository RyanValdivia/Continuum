import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../repository/find-member-role", () => ({
    findMemberRole: vi.fn(),
}));
vi.mock("../../repository/find-documents-page", () => ({
    findDocumentsPage: vi.fn(),
}));
vi.mock("../../repository/find-document-by-id", () => ({
    findDocumentById: vi.fn(),
}));
vi.mock("../../repository/find-document-chunks", () => ({
    findDocumentChunks: vi.fn(),
}));
vi.mock("../../repository/set-document-review", () => ({
    setDocumentReview: vi.fn(),
}));

import type { DocumentReviewSearch } from "@/core/document-review/domain/types";
import { findDocumentById } from "../../repository/find-document-by-id";
import { findDocumentChunks } from "../../repository/find-document-chunks";
import { findDocumentsPage } from "../../repository/find-documents-page";
import { findMemberRole } from "../../repository/find-member-role";
import { setDocumentReview } from "../../repository/set-document-review";
import { getDocumentService } from "../get-document-service";
import { reviewDocumentService } from "../review-document-service";
import { searchDocumentsService } from "../search-documents-service";

const row = {
    id: "d1",
    organizationId: "o1",
    personId: null,
    connector: "notion" as const,
    externalId: "notion-page-1",
    url: null,
    title: "Onboarding guide",
    contentHash: "abc123",
    reviewStatus: "pending" as const,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

const searchParams: DocumentReviewSearch = {
    page: 1,
    perPage: 20,
    sort: [],
    reviewStatus: [],
    connector: [],
    title: "",
};

describe("searchDocumentsService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns FORBIDDEN when the caller isn't an org admin", async () => {
        vi.mocked(findMemberRole).mockResolvedValue("member");
        const r = await searchDocumentsService("u1", "o1", searchParams);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
        expect(findDocumentsPage).not.toHaveBeenCalled();
    });

    it("returns FORBIDDEN when the caller isn't a member at all", async () => {
        vi.mocked(findMemberRole).mockResolvedValue(null);
        const r = await searchDocumentsService("u1", "o1", searchParams);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
    });

    it("maps rows to items and computes pageCount for an admin", async () => {
        vi.mocked(findMemberRole).mockResolvedValue("admin");
        vi.mocked(findDocumentsPage).mockResolvedValue({
            rows: [row],
            total: 5,
        });
        const r = await searchDocumentsService("u1", "o1", {
            ...searchParams,
            perPage: 2,
        });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.data.items).toHaveLength(1);
            expect(r.data.items[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
            expect(r.data.total).toBe(5);
            expect(r.data.pageCount).toBe(3);
        }
    });

    it("allows an owner too", async () => {
        vi.mocked(findMemberRole).mockResolvedValue("owner");
        vi.mocked(findDocumentsPage).mockResolvedValue({ rows: [], total: 0 });
        const r = await searchDocumentsService("u1", "o1", searchParams);
        expect(r.ok).toBe(true);
    });
});

describe("getDocumentService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns FORBIDDEN for a non-admin before touching the repository", async () => {
        vi.mocked(findMemberRole).mockResolvedValue("member");
        const r = await getDocumentService("u1", "o1", "d1");
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
        expect(findDocumentById).not.toHaveBeenCalled();
    });

    it("returns NOT_FOUND when the row is missing or foreign", async () => {
        vi.mocked(findMemberRole).mockResolvedValue("admin");
        vi.mocked(findDocumentById).mockResolvedValue(null);
        const r = await getDocumentService("u1", "o1", "d1");
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
        expect(findDocumentChunks).not.toHaveBeenCalled();
    });

    it("maps the row to the wire shape and joins chunk content for an admin", async () => {
        vi.mocked(findMemberRole).mockResolvedValue("admin");
        vi.mocked(findDocumentById).mockResolvedValue(row);
        vi.mocked(findDocumentChunks).mockResolvedValue([
            { content: "First part.", ord: 0 },
            { content: "Second part.", ord: 1 },
        ]);
        const r = await getDocumentService("u1", "o1", "d1");
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.data.title).toBe("Onboarding guide");
            expect(r.data.content).toBe("First part.\n\nSecond part.");
        }
    });

    it("returns an empty string when the document has no chunks yet", async () => {
        vi.mocked(findMemberRole).mockResolvedValue("admin");
        vi.mocked(findDocumentById).mockResolvedValue(row);
        vi.mocked(findDocumentChunks).mockResolvedValue([]);
        const r = await getDocumentService("u1", "o1", "d1");
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.data.content).toBe("");
    });
});

describe("reviewDocumentService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns FORBIDDEN for a non-admin before writing anything", async () => {
        vi.mocked(findMemberRole).mockResolvedValue("member");
        const r = await reviewDocumentService("u1", "o1", "d1", {
            reviewStatus: "approved",
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
        expect(setDocumentReview).not.toHaveBeenCalled();
    });

    it("returns NOT_FOUND when nothing was updated", async () => {
        vi.mocked(findMemberRole).mockResolvedValue("admin");
        vi.mocked(setDocumentReview).mockResolvedValue(null);
        const r = await reviewDocumentService("u1", "o1", "d1", {
            reviewStatus: "rejected",
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
    });

    it("reviews the document and attributes it to the calling admin", async () => {
        vi.mocked(findMemberRole).mockResolvedValue("admin");
        vi.mocked(setDocumentReview).mockResolvedValue({
            ...row,
            reviewStatus: "approved",
            reviewedBy: "u1",
            reviewNote: "Looks good",
            reviewedAt: new Date("2026-01-03T00:00:00.000Z"),
        });

        const r = await reviewDocumentService("u1", "o1", "d1", {
            reviewStatus: "approved",
            note: "Looks good",
        });

        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.data.reviewStatus).toBe("approved");
            expect(r.data.reviewedBy).toBe("u1");
            expect(r.data.reviewNote).toBe("Looks good");
        }
        expect(setDocumentReview).toHaveBeenCalledWith("d1", "o1", {
            reviewStatus: "approved",
            note: "Looks good",
            reviewedBy: "u1",
        });
    });
});
