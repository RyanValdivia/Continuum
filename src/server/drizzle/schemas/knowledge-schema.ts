import { sql } from "drizzle-orm";
import {
    check,
    index,
    integer,
    pgEnum,
    pgTable,
    real,
    text,
    timestamp,
    uniqueIndex,
    vector,
} from "drizzle-orm/pg-core";
import { organization } from "./organization-schema";

/**
 * Embedding width. `gemini-embedding-001` defaults to 3072 dims, which exceeds
 * pgvector's 2000-dim ceiling for an HNSW index — so ingestion requests this
 * reduced (Matryoshka) dimensionality and every stored vector is `vector(768)`.
 * Changing this requires a re-embed + migration; keep it a single source.
 */
export const EMBEDDING_DIM = 768;

export const knowledgeConnector = pgEnum("knowledge_connector", [
    "notion",
    "manual",
]);
export const knowledgeNodeType = pgEnum("knowledge_node_type", [
    "decision",
    "process",
    "concept",
    "document",
]);
export const knowledgeNodeOrigin = pgEnum("knowledge_node_origin", [
    "sync",
    "interview",
    "manual",
]);
export const knowledgeEdgeType = pgEnum("knowledge_edge_type", [
    "relates_to",
    "part_of",
    "references",
    "depends_on",
    "caused_by",
]);

/**
 * One ingested source (e.g. a Notion page). Owned by an org, attributed to a
 * person. `personId` is a plain column, not an FK — the `person` table lands in
 * a later domain; attribution must not block knowledge ingestion.
 */
export const sourceDocuments = pgTable(
    "source_documents",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        personId: text("person_id"),
        connector: knowledgeConnector("connector").notNull(),
        externalId: text("external_id").notNull(),
        url: text("url"),
        title: text("title").notNull(),
        contentHash: text("content_hash").notNull(),
        lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index("source_documents_organization_id_idx").on(table.organizationId),
        index("source_documents_person_id_idx").on(table.personId),
        // A connector's external id is unique within an org → upsert on re-sync.
        uniqueIndex("source_documents_connector_external_uq").on(
            table.organizationId,
            table.connector,
            table.externalId,
        ),
    ],
);

/**
 * A chunk of a source document plus its embedding. Vector retrieval runs here;
 * HNSW + cosine ops back the similarity search.
 */
export const chunks = pgTable(
    "chunks",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        documentId: text("document_id")
            .notNull()
            .references(() => sourceDocuments.id, { onDelete: "cascade" }),
        personId: text("person_id"),
        content: text("content").notNull(),
        ord: integer("ord").notNull(),
        embedding: vector("embedding", { dimensions: EMBEDDING_DIM }).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("chunks_organization_id_idx").on(table.organizationId),
        index("chunks_document_id_idx").on(table.documentId),
        index("chunks_person_id_idx").on(table.personId),
        index("chunks_embedding_hnsw_idx").using(
            "hnsw",
            table.embedding.op("vector_cosine_ops"),
        ),
        check(
            "chunks_content_not_empty",
            sql`length(trim(${table.content})) > 0`,
        ),
    ],
);

/**
 * A knowledge-graph node: a decision, process, concept, or document distilled
 * from the source. `personId` is the attribution seam (retrieval scopes on it).
 * A person is NOT a node type — attribution stays a single column write.
 */
export const knowledgeNodes = pgTable(
    "knowledge_nodes",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        personId: text("person_id"),
        type: knowledgeNodeType("type").notNull(),
        label: text("label").notNull(),
        summary: text("summary"),
        embedding: vector("embedding", { dimensions: EMBEDDING_DIM }),
        sourceChunkId: text("source_chunk_id").references(() => chunks.id, {
            onDelete: "set null",
        }),
        origin: knowledgeNodeOrigin("origin").notNull(),
        confidence: real("confidence").default(1).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("knowledge_nodes_organization_id_idx").on(table.organizationId),
        index("knowledge_nodes_person_id_idx").on(table.personId),
        index("knowledge_nodes_type_idx").on(table.type),
        index("knowledge_nodes_embedding_hnsw_idx").using(
            "hnsw",
            table.embedding.op("vector_cosine_ops"),
        ),
        check(
            "knowledge_nodes_label_not_empty",
            sql`length(trim(${table.label})) > 0`,
        ),
    ],
);

/**
 * A directed, typed relationship between two nodes. Graph traversal (recursive
 * CTE) walks these, org-scoped.
 */
export const knowledgeEdges = pgTable(
    "knowledge_edges",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        fromNodeId: text("from_node_id")
            .notNull()
            .references(() => knowledgeNodes.id, { onDelete: "cascade" }),
        toNodeId: text("to_node_id")
            .notNull()
            .references(() => knowledgeNodes.id, { onDelete: "cascade" }),
        type: knowledgeEdgeType("type").notNull(),
        weight: real("weight").default(1).notNull(),
        sourceChunkId: text("source_chunk_id").references(() => chunks.id, {
            onDelete: "set null",
        }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("knowledge_edges_organization_id_idx").on(table.organizationId),
        index("knowledge_edges_from_node_id_idx").on(table.fromNodeId),
        index("knowledge_edges_to_node_id_idx").on(table.toNodeId),
        uniqueIndex("knowledge_edges_unique_triple").on(
            table.fromNodeId,
            table.toNodeId,
            table.type,
        ),
    ],
);

export type SourceDocumentRow = typeof sourceDocuments.$inferSelect;
export type NewSourceDocumentRow = typeof sourceDocuments.$inferInsert;
export type ChunkRow = typeof chunks.$inferSelect;
export type NewChunkRow = typeof chunks.$inferInsert;
export type KnowledgeNodeRow = typeof knowledgeNodes.$inferSelect;
export type NewKnowledgeNodeRow = typeof knowledgeNodes.$inferInsert;
export type KnowledgeEdgeRow = typeof knowledgeEdges.$inferSelect;
export type NewKnowledgeEdgeRow = typeof knowledgeEdges.$inferInsert;
