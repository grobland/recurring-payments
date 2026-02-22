CREATE TYPE "public"."account_type" AS ENUM('bank_debit', 'credit_card', 'loan');--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"account_type" "account_type" NOT NULL,
	"institution" varchar(100),
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"credit_limit" numeric(12, 2),
	"statement_closing_day" integer,
	"original_balance" numeric(12, 2),
	"interest_rate" numeric(5, 4),
	"loan_term_months" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "statements_user_hash_idx";--> statement-breakpoint
ALTER TABLE "statements" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_accounts_user_id_idx" ON "financial_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "financial_accounts_type_idx" ON "financial_accounts" USING btree ("account_type");--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "statements_user_hash_source_idx" ON "statements" USING btree ("user_id","pdf_hash","source_type");--> statement-breakpoint
CREATE INDEX "statements_account_id_idx" ON "statements" USING btree ("account_id");