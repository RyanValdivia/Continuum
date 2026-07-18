import {
    createSearchParamsCache,
    parseAsArrayOf,
    parseAsInteger,
    parseAsString,
} from "nuqs/server";
import { getSortingStateParser } from "@/frontend/lib/parsers";
import type { DocumentReview } from "./types";

/**
 * nuqs parsers describing the document-reviews table URL state. Keys MUST
 * match what `useDataTable` writes on the client (`page`, `perPage`, `sort`,
 * plus `reviewStatus`/`connector`/`title` since those columns are
 * filterable) so the server cache below and the client table engine agree on
 * one URL contract.
 */
export const documentReviewSearchParsers = {
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(20),
    sort: getSortingStateParser<DocumentReview>().withDefault([
        { id: "createdAt", desc: true },
    ]),
    reviewStatus: parseAsArrayOf(parseAsString).withDefault([]),
    connector: parseAsArrayOf(parseAsString).withDefault([]),
    title: parseAsString.withDefault(""),
};

/**
 * Request-scoped search-params cache for the `/documents` RSC tree. `page.tsx`
 * calls `.parse(searchParams)` once; the table `server.tsx` reads the parsed
 * state back with `.all()` (React `cache()`-backed, same request). The page
 * then runs those values through `documentReviewSearchSchema.parse` to
 * coerce/whitelist them into a `DocumentReviewSearch`.
 */
export const documentReviewsSearchParamsCache = createSearchParamsCache(
    documentReviewSearchParsers,
);
