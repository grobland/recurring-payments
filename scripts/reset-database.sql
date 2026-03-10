-- ============================================================
-- RESET DATABASE — Full clean slate for end-to-end testing
-- ============================================================
-- Run this in the Supabase SQL Editor to wipe all data.
-- After running, execute:
--   npm run db:seed                              (default categories)
--   npx tsx src/scripts/seed-stripe-prices.ts    (stripe prices)
-- ============================================================

-- 1. Drop materialized view first (depends on subscriptions + categories)
DROP MATERIALIZED VIEW IF EXISTS user_analytics_mv;

-- 2. Drop all tables in reverse dependency order
--    (children before parents to satisfy FK constraints)

-- Junction / leaf tables (no dependents)
DROP TABLE IF EXISTS transaction_tags       CASCADE;
DROP TABLE IF EXISTS trial_extensions       CASCADE;
DROP TABLE IF EXISTS webhook_events         CASCADE;
DROP TABLE IF EXISTS stripe_prices          CASCADE;
DROP TABLE IF EXISTS fx_rates_cache         CASCADE;
DROP TABLE IF EXISTS password_reset_tokens  CASCADE;
DROP TABLE IF EXISTS verification_tokens    CASCADE;
DROP TABLE IF EXISTS authenticators         CASCADE;

-- Tables with FKs to other app tables
DROP TABLE IF EXISTS reminder_logs          CASCADE;
DROP TABLE IF EXISTS alerts                 CASCADE;
DROP TABLE IF EXISTS recurring_patterns     CASCADE;
DROP TABLE IF EXISTS tags                   CASCADE;
DROP TABLE IF EXISTS transactions           CASCADE;
DROP TABLE IF EXISTS statements             CASCADE;
DROP TABLE IF EXISTS financial_accounts     CASCADE;
DROP TABLE IF EXISTS subscriptions          CASCADE;
DROP TABLE IF EXISTS import_audits          CASCADE;
DROP TABLE IF EXISTS categories             CASCADE;

-- Auth tables (depend on users)
DROP TABLE IF EXISTS sessions               CASCADE;
DROP TABLE IF EXISTS accounts               CASCADE;

-- Root table
DROP TABLE IF EXISTS users                  CASCADE;

-- 3. Drop all custom enums
DROP TYPE IF EXISTS subscription_status     CASCADE;
DROP TYPE IF EXISTS frequency               CASCADE;
DROP TYPE IF EXISTS billing_status          CASCADE;
DROP TYPE IF EXISTS reminder_status         CASCADE;
DROP TYPE IF EXISTS alert_type              CASCADE;
DROP TYPE IF EXISTS processing_status       CASCADE;
DROP TYPE IF EXISTS transaction_tag_status  CASCADE;
DROP TYPE IF EXISTS tier                    CASCADE;
DROP TYPE IF EXISTS user_role               CASCADE;
DROP TYPE IF EXISTS account_type            CASCADE;

-- ============================================================
-- Done! Now run:
--   npm run db:push      (recreate schema from Drizzle)
--   npm run db:seed      (seed default categories)
--   npx tsx src/scripts/seed-stripe-prices.ts  (optional)
--   npm run dev           (start the app)
-- ============================================================
