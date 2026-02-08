CREATE TYPE "public"."processing_status" AS ENUM('pending', 'processing', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."transaction_tag_status" AS ENUM('unreviewed', 'potential_subscription', 'not_subscription', 'converted');--> statement-breakpoint
CREATE TABLE "statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" varchar(100) NOT NULL,
	"pdf_hash" varchar(64) NOT NULL,
	"pdf_storage_path" text,
	"original_filename" varchar(255) NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"statement_date" timestamp with time zone,
	"processing_status" "processing_status" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_date" timestamp with time zone NOT NULL,
	"merchant_name" varchar(255) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"description" text,
	"fingerprint" varchar(64) NOT NULL,
	"tag_status" "transaction_tag_status" DEFAULT 'unreviewed' NOT NULL,
	"confidence_score" integer,
	"category_guess" varchar(100),
	"raw_text" text,
	"ai_metadata" jsonb,
	"converted_to_subscription_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_statement_id_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "public"."statements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_converted_to_subscription_id_subscriptions_id_fk" FOREIGN KEY ("converted_to_subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "statements_user_id_idx" ON "statements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "statements_pdf_hash_idx" ON "statements" USING btree ("pdf_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "statements_user_hash_idx" ON "statements" USING btree ("user_id","pdf_hash");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_statement_id_idx" ON "transactions" USING btree ("statement_id");--> statement-breakpoint
CREATE INDEX "transactions_fingerprint_idx" ON "transactions" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "transactions_tag_status_idx" ON "transactions" USING btree ("tag_status");--> statement-breakpoint
CREATE INDEX "transactions_date_idx" ON "transactions" USING btree ("transaction_date");