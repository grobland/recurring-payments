ALTER TABLE "subscriptions" ADD COLUMN "merged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "merged_into_id" uuid;