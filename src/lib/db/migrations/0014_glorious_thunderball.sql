-- Enable pg_trgm extension for fuzzy matching (must be enabled in Supabase dashboard first)
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."amount_type" AS ENUM('fixed', 'variable');--> statement-breakpoint
CREATE TYPE "public"."recurring_kind" AS ENUM('subscription', 'utility', 'insurance', 'loan', 'rent_mortgage', 'membership', 'installment', 'other_recurring');--> statement-breakpoint
CREATE TYPE "public"."recurring_status" AS ENUM('active', 'paused', 'cancelled', 'dormant', 'needs_review');--> statement-breakpoint
CREATE TABLE "merchant_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_entity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"alias_text" varchar(255) NOT NULL,
	"is_user_defined" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"normalized_name" varchar(255) NOT NULL,
	"category" varchar(100),
	"website" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recurring_master_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_master_series_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recurring_master_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_masters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"merchant_entity_id" uuid,
	"category_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"notes" text,
	"url" text,
	"recurring_kind" "recurring_kind" NOT NULL,
	"status" "recurring_status" DEFAULT 'active' NOT NULL,
	"amount_type" "amount_type",
	"expected_amount" numeric(10, 2),
	"expected_amount_min" numeric(10, 2),
	"expected_amount_max" numeric(10, 2),
	"currency" varchar(3) NOT NULL,
	"billing_frequency" varchar(50),
	"billing_day_of_month" integer,
	"next_expected_date" timestamp with time zone,
	"last_charge_date" timestamp with time zone,
	"confidence" numeric(5, 4),
	"importance_rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"merchant_entity_id" uuid,
	"detected_frequency" varchar(50),
	"interval_days" integer,
	"day_of_month" integer,
	"amount_type" "amount_type",
	"avg_amount" numeric(10, 2),
	"min_amount" numeric(10, 2),
	"max_amount" numeric(10, 2),
	"amount_stddev" numeric(10, 4),
	"currency" varchar(3),
	"confidence" numeric(5, 4),
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"next_expected_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_series_transactions" (
	"series_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"match_confidence" numeric(5, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_series_transactions_series_id_transaction_id_pk" PRIMARY KEY("series_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "review_queue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"series_id" uuid,
	"recurring_master_id" uuid,
	"transaction_id" uuid,
	"confidence" numeric(5, 4),
	"suggested_action" jsonb,
	"resolved_at" timestamp with time zone,
	"resolution" varchar(50),
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_transaction_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"label" varchar(50) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_accounts" ALTER COLUMN "currency" SET DEFAULT 'GBP';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "normalized_description" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "source_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "merchant_aliases" ADD CONSTRAINT "merchant_aliases_merchant_entity_id_merchant_entities_id_fk" FOREIGN KEY ("merchant_entity_id") REFERENCES "public"."merchant_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_aliases" ADD CONSTRAINT "merchant_aliases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_entities" ADD CONSTRAINT "merchant_entities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_events" ADD CONSTRAINT "recurring_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_events" ADD CONSTRAINT "recurring_events_recurring_master_id_recurring_masters_id_fk" FOREIGN KEY ("recurring_master_id") REFERENCES "public"."recurring_masters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_master_series_links" ADD CONSTRAINT "recurring_master_series_links_recurring_master_id_recurring_masters_id_fk" FOREIGN KEY ("recurring_master_id") REFERENCES "public"."recurring_masters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_master_series_links" ADD CONSTRAINT "recurring_master_series_links_series_id_recurring_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."recurring_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_masters" ADD CONSTRAINT "recurring_masters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_masters" ADD CONSTRAINT "recurring_masters_merchant_entity_id_merchant_entities_id_fk" FOREIGN KEY ("merchant_entity_id") REFERENCES "public"."merchant_entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_masters" ADD CONSTRAINT "recurring_masters_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_series" ADD CONSTRAINT "recurring_series_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_series" ADD CONSTRAINT "recurring_series_merchant_entity_id_merchant_entities_id_fk" FOREIGN KEY ("merchant_entity_id") REFERENCES "public"."merchant_entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_series_transactions" ADD CONSTRAINT "recurring_series_transactions_series_id_recurring_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."recurring_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_series_transactions" ADD CONSTRAINT "recurring_series_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue_items" ADD CONSTRAINT "review_queue_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue_items" ADD CONSTRAINT "review_queue_items_series_id_recurring_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."recurring_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue_items" ADD CONSTRAINT "review_queue_items_recurring_master_id_recurring_masters_id_fk" FOREIGN KEY ("recurring_master_id") REFERENCES "public"."recurring_masters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue_items" ADD CONSTRAINT "review_queue_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_transaction_labels" ADD CONSTRAINT "user_transaction_labels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_transaction_labels" ADD CONSTRAINT "user_transaction_labels_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "merchant_aliases_merchant_entity_id_idx" ON "merchant_aliases" USING btree ("merchant_entity_id");--> statement-breakpoint
CREATE INDEX "merchant_aliases_user_id_idx" ON "merchant_aliases" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_aliases_user_alias_text_idx" ON "merchant_aliases" USING btree ("user_id","alias_text");--> statement-breakpoint
CREATE INDEX "merchant_entities_user_id_idx" ON "merchant_entities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_entities_user_normalized_name_idx" ON "merchant_entities" USING btree ("user_id","normalized_name");--> statement-breakpoint
CREATE INDEX "recurring_events_user_id_idx" ON "recurring_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_events_master_id_idx" ON "recurring_events" USING btree ("recurring_master_id");--> statement-breakpoint
CREATE INDEX "recurring_events_created_at_idx" ON "recurring_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "recurring_events_event_type_idx" ON "recurring_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "rmsl_master_series_idx" ON "recurring_master_series_links" USING btree ("recurring_master_id","series_id");--> statement-breakpoint
CREATE INDEX "rmsl_recurring_master_id_idx" ON "recurring_master_series_links" USING btree ("recurring_master_id");--> statement-breakpoint
CREATE INDEX "rmsl_series_id_idx" ON "recurring_master_series_links" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "recurring_masters_user_id_idx" ON "recurring_masters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_masters_merchant_entity_id_idx" ON "recurring_masters" USING btree ("merchant_entity_id");--> statement-breakpoint
CREATE INDEX "recurring_masters_user_status_idx" ON "recurring_masters" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "recurring_masters_user_kind_idx" ON "recurring_masters" USING btree ("user_id","recurring_kind");--> statement-breakpoint
CREATE INDEX "recurring_masters_next_expected_date_idx" ON "recurring_masters" USING btree ("next_expected_date");--> statement-breakpoint
CREATE INDEX "recurring_series_user_id_idx" ON "recurring_series" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_series_merchant_entity_id_idx" ON "recurring_series" USING btree ("merchant_entity_id");--> statement-breakpoint
CREATE INDEX "recurring_series_active_idx" ON "recurring_series" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "rst_series_id_idx" ON "recurring_series_transactions" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "rst_transaction_id_idx" ON "recurring_series_transactions" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "review_queue_user_id_idx" ON "review_queue_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "review_queue_unresolved_idx" ON "review_queue_items" USING btree ("user_id","resolved_at");--> statement-breakpoint
CREATE INDEX "review_queue_series_id_idx" ON "review_queue_items" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "review_queue_item_type_idx" ON "review_queue_items" USING btree ("user_id","item_type");--> statement-breakpoint
CREATE UNIQUE INDEX "utl_user_transaction_idx" ON "user_transaction_labels" USING btree ("user_id","transaction_id");--> statement-breakpoint
CREATE INDEX "utl_user_id_idx" ON "user_transaction_labels" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "utl_transaction_id_idx" ON "user_transaction_labels" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "utl_label_idx" ON "user_transaction_labels" USING btree ("user_id","label");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_source_hash_idx" ON "transactions" USING btree ("user_id","source_hash") WHERE source_hash IS NOT NULL;
-- Trigram GIN indexes for fuzzy matching (SCHEMA-16)
CREATE INDEX IF NOT EXISTS merchant_aliases_alias_text_trgm_idx ON merchant_aliases USING GIN (alias_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS merchant_entities_name_trgm_idx ON merchant_entities USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS transactions_normalized_description_trgm_idx ON transactions USING GIN (normalized_description gin_trgm_ops);