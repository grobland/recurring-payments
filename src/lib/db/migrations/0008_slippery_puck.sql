CREATE TYPE "public"."tier" AS ENUM('primary', 'enhanced', 'advanced');--> statement-breakpoint
CREATE TABLE "stripe_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_price_id" varchar(255) NOT NULL,
	"tier" "tier" NOT NULL,
	"interval" varchar(20) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"amount_cents" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_prices_price_id_idx" ON "stripe_prices" USING btree ("stripe_price_id");--> statement-breakpoint
CREATE INDEX "stripe_prices_tier_idx" ON "stripe_prices" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "stripe_prices_active_idx" ON "stripe_prices" USING btree ("is_active");