CREATE TABLE "microsoft_identity" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"microsoft_user_id" text NOT NULL,
	"email" text,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "microsoft_identity" ADD CONSTRAINT "microsoft_identity_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microsoft_identity" ADD CONSTRAINT "microsoft_identity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "microsoft_identity_org_user_idx" ON "microsoft_identity" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "microsoft_identity_org_ms_user_idx" ON "microsoft_identity" USING btree ("organization_id","microsoft_user_id");