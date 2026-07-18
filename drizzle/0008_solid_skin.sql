CREATE TYPE "public"."acl_effect" AS ENUM('allow', 'deny');--> statement-breakpoint
CREATE TYPE "public"."acl_permission" AS ENUM('read', 'write', 'admin');--> statement-breakpoint
CREATE TYPE "public"."acl_resource_type" AS ENUM('knowledge_node', 'source_document', 'ou');--> statement-breakpoint
CREATE TYPE "public"."default_access" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."principal_type" AS ENUM('person', 'group', 'ou');--> statement-breakpoint
CREATE TABLE "access_control_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"resource_type" "acl_resource_type" NOT NULL,
	"resource_id" text NOT NULL,
	"principal_id" text NOT NULL,
	"permission" "acl_permission" NOT NULL,
	"effect" "acl_effect" NOT NULL,
	"inheritable" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_access_policy" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"default_access" "default_access" DEFAULT 'open' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "principal" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" "principal_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"user_id" text,
	"parent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "principal_name_not_empty" CHECK (length(trim("principal"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "principal_membership" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"group_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_control_entry" ADD CONSTRAINT "access_control_entry_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_control_entry" ADD CONSTRAINT "access_control_entry_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_control_entry" ADD CONSTRAINT "access_control_entry_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_access_policy" ADD CONSTRAINT "organization_access_policy_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal" ADD CONSTRAINT "principal_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal" ADD CONSTRAINT "principal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal" ADD CONSTRAINT "principal_parent_id_principal_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_membership" ADD CONSTRAINT "principal_membership_member_id_principal_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_membership" ADD CONSTRAINT "principal_membership_group_id_principal_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_control_entry_resource_idx" ON "access_control_entry" USING btree ("organization_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "access_control_entry_principal_id_idx" ON "access_control_entry" USING btree ("principal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "access_control_entry_unique_grant" ON "access_control_entry" USING btree ("resource_type","resource_id","principal_id","permission","effect");--> statement-breakpoint
CREATE INDEX "principal_organization_id_idx" ON "principal" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "principal_organization_id_type_idx" ON "principal" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "principal_parent_id_idx" ON "principal" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "principal_organization_id_user_id_uq" ON "principal" USING btree ("organization_id","user_id") WHERE "principal"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "principal_membership_member_group_uq" ON "principal_membership" USING btree ("member_id","group_id");--> statement-breakpoint
CREATE INDEX "principal_membership_member_id_idx" ON "principal_membership" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "principal_membership_group_id_idx" ON "principal_membership" USING btree ("group_id");