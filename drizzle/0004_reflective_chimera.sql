CREATE TYPE "public"."document_review_status" AS ENUM('pending', 'approved', 'rejected', 'flagged');--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "review_status" "document_review_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_documents_org_review_status_idx" ON "source_documents" USING btree ("organization_id","review_status");