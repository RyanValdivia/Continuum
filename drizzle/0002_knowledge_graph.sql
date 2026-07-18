CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."knowledge_connector" AS ENUM('notion', 'manual');--> statement-breakpoint
CREATE TYPE "public"."knowledge_edge_type" AS ENUM('relates_to', 'part_of', 'references', 'depends_on', 'caused_by');--> statement-breakpoint
CREATE TYPE "public"."knowledge_node_origin" AS ENUM('sync', 'interview', 'manual');--> statement-breakpoint
CREATE TYPE "public"."knowledge_node_type" AS ENUM('decision', 'process', 'concept', 'document');--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"document_id" text NOT NULL,
	"person_id" text,
	"content" text NOT NULL,
	"ord" integer NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chunks_content_not_empty" CHECK (length(trim("chunks"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "knowledge_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"from_node_id" text NOT NULL,
	"to_node_id" text NOT NULL,
	"type" "knowledge_edge_type" NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"source_chunk_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" text,
	"type" "knowledge_node_type" NOT NULL,
	"label" text NOT NULL,
	"summary" text,
	"embedding" vector(768),
	"source_chunk_id" text,
	"origin" "knowledge_node_origin" NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_nodes_label_not_empty" CHECK (length(trim("knowledge_nodes"."label")) > 0)
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" text,
	"connector" "knowledge_connector" NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"title" text NOT NULL,
	"content_hash" text NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_source_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."source_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_from_node_id_knowledge_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."knowledge_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_to_node_id_knowledge_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."knowledge_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_source_chunk_id_chunks_id_fk" FOREIGN KEY ("source_chunk_id") REFERENCES "public"."chunks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_nodes" ADD CONSTRAINT "knowledge_nodes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_nodes" ADD CONSTRAINT "knowledge_nodes_source_chunk_id_chunks_id_fk" FOREIGN KEY ("source_chunk_id") REFERENCES "public"."chunks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_organization_id_idx" ON "chunks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "chunks_document_id_idx" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "chunks_person_id_idx" ON "chunks" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "chunks_embedding_hnsw_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "knowledge_edges_organization_id_idx" ON "knowledge_edges" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "knowledge_edges_from_node_id_idx" ON "knowledge_edges" USING btree ("from_node_id");--> statement-breakpoint
CREATE INDEX "knowledge_edges_to_node_id_idx" ON "knowledge_edges" USING btree ("to_node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_edges_unique_triple" ON "knowledge_edges" USING btree ("from_node_id","to_node_id","type");--> statement-breakpoint
CREATE INDEX "knowledge_nodes_organization_id_idx" ON "knowledge_nodes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "knowledge_nodes_person_id_idx" ON "knowledge_nodes" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "knowledge_nodes_type_idx" ON "knowledge_nodes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "knowledge_nodes_embedding_hnsw_idx" ON "knowledge_nodes" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "source_documents_organization_id_idx" ON "source_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "source_documents_person_id_idx" ON "source_documents" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_documents_connector_external_uq" ON "source_documents" USING btree ("organization_id","connector","external_id");