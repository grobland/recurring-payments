CREATE TYPE "public"."document_type" AS ENUM('bank_debit', 'credit_card', 'loan');--> statement-breakpoint
CREATE TABLE "statement_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"transaction_date" timestamp with time zone,
	"description" text NOT NULL,
	"amount" numeric(12, 2),
	"currency" varchar(3),
	"balance" numeric(12, 2),
	"document_type" "document_type" NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "display_currency" SET DEFAULT 'GBP';--> statement-breakpoint
ALTER TABLE "statement_line_items" ADD CONSTRAINT "statement_line_items_statement_id_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "public"."statements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_line_items" ADD CONSTRAINT "statement_line_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sli_statement_id_idx" ON "statement_line_items" USING btree ("statement_id");--> statement-breakpoint
CREATE INDEX "sli_user_id_idx" ON "statement_line_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sli_transaction_date_idx" ON "statement_line_items" USING btree ("transaction_date");--> statement-breakpoint
CREATE UNIQUE INDEX "sli_statement_sequence_idx" ON "statement_line_items" USING btree ("statement_id","sequence_number");