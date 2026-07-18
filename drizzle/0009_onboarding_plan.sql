CREATE TABLE "onboarding_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"new_hire_member_id" text NOT NULL,
	"role_title" text NOT NULL,
	"benchmark_person_id" text,
	"benchmark_person_name" text,
	"vacancy_id" text,
	"days" jsonb NOT NULL,
	"completed_task_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onboarding_plan" ADD CONSTRAINT "onboarding_plan_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "onboarding_plan_org_member_idx" ON "onboarding_plan" USING btree ("organization_id","new_hire_member_id");
