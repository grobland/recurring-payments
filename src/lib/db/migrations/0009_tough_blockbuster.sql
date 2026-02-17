CREATE TABLE "trial_extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"days_added" integer NOT NULL,
	"previous_trial_end_date" timestamp with time zone,
	"new_trial_end_date" timestamp with time zone NOT NULL,
	"applied_by_admin_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trial_extensions" ADD CONSTRAINT "trial_extensions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_extensions" ADD CONSTRAINT "trial_extensions_applied_by_admin_id_users_id_fk" FOREIGN KEY ("applied_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trial_extensions_user_id_idx" ON "trial_extensions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trial_extensions_created_at_idx" ON "trial_extensions" USING btree ("created_at");