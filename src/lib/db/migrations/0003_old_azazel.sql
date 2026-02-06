CREATE TABLE "recurring_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"merchant_name" varchar(255) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"occurrence_count" integer NOT NULL,
	"avg_amount" numeric(10, 2) NOT NULL,
	"amount_stddev" numeric(10, 2),
	"avg_interval_days" integer,
	"interval_stddev" integer,
	"detected_frequency" "frequency",
	"charge_dates" jsonb NOT NULL,
	"amounts" jsonb NOT NULL,
	"confidence_score" integer NOT NULL,
	"dismissed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_subscription_id" uuid,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurring_patterns" ADD CONSTRAINT "recurring_patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_patterns" ADD CONSTRAINT "recurring_patterns_created_subscription_id_subscriptions_id_fk" FOREIGN KEY ("created_subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_patterns_user_id_idx" ON "recurring_patterns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_patterns_merchant_currency_idx" ON "recurring_patterns" USING btree ("merchant_name","currency");--> statement-breakpoint
CREATE INDEX "recurring_patterns_confidence_idx" ON "recurring_patterns" USING btree ("confidence_score");