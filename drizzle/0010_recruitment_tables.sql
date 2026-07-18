CREATE TYPE "public"."candidate_status" AS ENUM('pending', 'analyzed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."vacancy_benchmark_type" AS ENUM('person', 'manual');--> statement-breakpoint
CREATE TYPE "public"."vacancy_status" AS ENUM('open', 'filled', 'closed');--> statement-breakpoint
CREATE TABLE "analysis" (
	"candidate_id" text PRIMARY KEY NOT NULL,
	"score" real NOT NULL,
	"dimensions" jsonb NOT NULL,
	"summary" text NOT NULL,
	"interview_questions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate" (
	"id" text PRIMARY KEY NOT NULL,
	"vacancy_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"cv_filename" text NOT NULL,
	"cv_text" text NOT NULL,
	"profile" jsonb NOT NULL,
	"status" "candidate_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vacancy" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"benchmark_type" "vacancy_benchmark_type" NOT NULL,
	"manual_description" text,
	"public_token" text NOT NULL,
	"status" "vacancy_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vacancy_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
ALTER TABLE "analysis" ADD CONSTRAINT "analysis_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate" ADD CONSTRAINT "candidate_vacancy_id_vacancy_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "public"."vacancy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancy" ADD CONSTRAINT "vacancy_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_vacancy_id_idx" ON "candidate" USING btree ("vacancy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_vacancy_email_uq" ON "candidate" USING btree ("vacancy_id","email");--> statement-breakpoint
CREATE INDEX "vacancy_organization_id_idx" ON "vacancy" USING btree ("organization_id");
