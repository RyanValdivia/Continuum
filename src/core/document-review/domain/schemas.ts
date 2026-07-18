import { z } from "zod";

export const reviewStatusSchema = z.enum([
    "pending",
    "approved",
    "rejected",
    "flagged",
]);

/** Statuses a reviewer can *set* from the UI — you don't "action" a doc back
 *  to `pending`; that's the default. */
export const reviewActionStatusSchema = z.enum([
    "approved",
    "rejected",
    "flagged",
]);

/** Mirrors the Drizzle `knowledgeConnector` enum — kept local so this domain
 *  owns its own wire schema instead of importing a `knowledge` type. */
export const connectorSchema = z.enum(["notion", "slack", "manual"]);

/** Wire shape (Date → ISO string at the repo boundary). */
export const documentReviewSchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    personId: z.string().nullable(),
    connector: connectorSchema,
    title: z.string(),
    url: z.string().nullable(),
    reviewStatus: reviewStatusSchema,
    reviewedBy: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    reviewNote: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

/** `documentReviewSchema` + the ingested text (chunks joined in order) — only
 *  fetched for the single-document detail view, never the paginated list. */
export const documentDetailSchema = documentReviewSchema.extend({
    content: z.string(),
});

export const reviewDocumentSchema = z.object({
    reviewStatus: reviewActionStatusSchema,
    note: z.string().trim().max(2000).optional(),
});

export const DOCUMENT_REVIEW_SORTABLE_COLUMNS = [
    "title",
    "reviewStatus",
    "createdAt",
    "updatedAt",
] as const;

export const documentReviewSortItemSchema = z.object({
    id: z.enum(DOCUMENT_REVIEW_SORTABLE_COLUMNS),
    desc: z.boolean(),
});

/**
 * Parses the `sort` query param for `GET /document-reviews`. Accepts either
 * an already-parsed array (RSC callers passing a plain object) or the
 * JSON-encoded string Eden/the URL sends over the wire. Mirrors
 * `project`'s `parseSortParam` — a malformed string degrades to `[]` instead
 * of throwing.
 */
function parseSortParam(value: unknown): unknown {
    if (typeof value === "string" && value) {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return value ?? [];
}

export const documentReviewSearchSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    // 999 is the data table's "Todos" (show all) sentinel — must stay >= it.
    perPage: z.coerce.number().int().min(1).max(999).default(20),
    sort: z
        .preprocess(parseSortParam, z.array(documentReviewSortItemSchema))
        .catch([]),
    reviewStatus: z
        .preprocess(
            (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
            z.array(reviewStatusSchema),
        )
        .catch([]),
    connector: z
        .preprocess(
            (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
            z.array(connectorSchema),
        )
        .catch([]),
    title: z.string().trim().default(""),
});

export const paginatedDocumentReviewsSchema = z.object({
    items: z.array(documentReviewSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    perPage: z.number().int().min(1),
    pageCount: z.number().int().nonnegative(),
});
