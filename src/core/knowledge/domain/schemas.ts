import { z } from "zod";

// ── Enums (mirror the Drizzle pg enums) ───────────────────────────────────────
export const connectorSchema = z.enum([
    "notion",
    "slack",
    "manual",
    "microsoft",
]);
export const nodeTypeSchema = z.enum([
    "decision",
    "process",
    "concept",
    "document",
    "person",
    "vacancy",
]);

/** Content node types the LLM extractor may emit — structural types
 *  (`person`, `vacancy`) are created by the recruitment domain, never by
 *  extraction. */
export const extractedNodeTypeSchema = z.enum([
    "decision",
    "process",
    "concept",
    "document",
]);
export const nodeOriginSchema = z.enum(["sync", "interview", "manual"]);
export const edgeTypeSchema = z.enum([
    "relates_to",
    "part_of",
    "references",
    "depends_on",
    "caused_by",
]);

// ── Wire shapes (no embedding: vectors never cross the wire) ───────────────────
export const sourceDocumentSchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    personId: z.string().nullable(),
    connector: connectorSchema,
    externalId: z.string(),
    url: z.string().nullable(),
    title: z.string(),
    contentHash: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const chunkSchema = z.object({
    id: z.string(),
    documentId: z.string(),
    personId: z.string().nullable(),
    content: z.string(),
    ord: z.number().int().nonnegative(),
});

export const nodeSchema = z.object({
    id: z.string(),
    personId: z.string().nullable(),
    type: nodeTypeSchema,
    label: z.string(),
    summary: z.string().nullable(),
    sourceChunkId: z.string().nullable(),
    origin: nodeOriginSchema,
    confidence: z.number(),
    createdAt: z.string(),
});

export const edgeSchema = z.object({
    id: z.string(),
    fromNodeId: z.string(),
    toNodeId: z.string(),
    type: edgeTypeSchema,
    weight: z.number(),
});

// ── Ingestion input (the source-agnostic seam a connector calls) ──────────────
export const ingestDocumentSchema = z.object({
    connector: connectorSchema,
    /** Stable id from the source system (Notion page id, etc.). */
    externalId: z.string().trim().min(1).max(512),
    title: z.string().trim().min(1).max(1000),
    /** Full plain text; the service chunks + embeds it. */
    content: z.string().trim().min(1).max(500_000),
    url: z.url().max(2000).optional(),
    personId: z.string().trim().min(1).optional(),
    /** Run LLM graph extraction after embedding. Default true. */
    extract: z.boolean().default(true),
});

export const ingestResultSchema = z.object({
    documentId: z.string(),
    chunksCreated: z.number().int().nonnegative(),
    nodesCreated: z.number().int().nonnegative(),
    edgesCreated: z.number().int().nonnegative(),
});

// ── Search (hybrid retrieval) ─────────────────────────────────────────────────
export const searchKnowledgeSchema = z.object({
    query: z.string().trim().min(1).max(2000),
    /** Scope retrieval to one person's knowledge. */
    personId: z.string().trim().min(1).optional(),
    /** Top-K chunks/nodes to retrieve. */
    limit: z.coerce.number().int().min(1).max(50).default(8),
    /** Graph expansion depth from matched nodes (0 = no expansion). */
    hops: z.coerce.number().int().min(0).max(2).default(1),
});

export const scoredChunkSchema = chunkSchema.extend({
    /** Cosine similarity in [0, 1]; higher is closer. */
    score: z.number(),
});

export const scoredNodeSchema = nodeSchema.extend({
    score: z.number().nullable(),
});

export const searchResultSchema = z.object({
    query: z.string(),
    chunks: z.array(scoredChunkSchema),
    nodes: z.array(scoredNodeSchema),
    edges: z.array(edgeSchema),
});

// ── Graph view ────────────────────────────────────────────────────────────────
export const graphQuerySchema = z.object({
    personId: z.string().trim().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const graphSchema = z.object({
    nodes: z.array(nodeSchema),
    edges: z.array(edgeSchema),
});

// ── LLM extraction output (structured generateObject target) ──────────────────
// `tempId` links edges to nodes within one extraction; mapped to real UUIDs on
// insert. The model never sees or invents database ids.
export const extractedGraphSchema = z.object({
    nodes: z
        .array(
            z.object({
                tempId: z.string(),
                type: extractedNodeTypeSchema,
                label: z.string().min(1).max(200),
                summary: z.string().max(2000).optional(),
            }),
        )
        .max(50),
    edges: z
        .array(
            z.object({
                from: z.string(),
                to: z.string(),
                type: edgeTypeSchema,
            }),
        )
        .max(100),
});
