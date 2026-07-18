import type { z } from "zod";
import type {
    connectorSchema,
    documentDetailSchema,
    documentReviewSchema,
    documentReviewSearchSchema,
    documentReviewSortItemSchema,
    paginatedDocumentReviewsSchema,
    reviewActionStatusSchema,
    reviewDocumentSchema,
    reviewStatusSchema,
} from "./schemas";

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type ReviewActionStatus = z.infer<typeof reviewActionStatusSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type DocumentReview = z.infer<typeof documentReviewSchema>;
export type DocumentDetail = z.infer<typeof documentDetailSchema>;
export type ReviewDocument = z.infer<typeof reviewDocumentSchema>;
export type DocumentReviewSort = z.infer<typeof documentReviewSortItemSchema>;
export type DocumentReviewSearch = z.infer<typeof documentReviewSearchSchema>;
export type PaginatedDocumentReviews = z.infer<
    typeof paginatedDocumentReviewsSchema
>;
