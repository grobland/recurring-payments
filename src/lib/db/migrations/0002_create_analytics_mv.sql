-- Migration: Create user_analytics_mv materialized view
-- Purpose: Pre-computed spending aggregates for dashboard analytics (<100ms queries)
-- Refresh: Every 15 minutes via Vercel cron job

-- Drop existing view if it exists (for idempotent migration)
DROP MATERIALIZED VIEW IF EXISTS user_analytics_mv;

-- Create the materialized view
CREATE MATERIALIZED VIEW user_analytics_mv AS
SELECT
  s.user_id,
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  DATE_TRUNC('month', s.next_renewal_date AT TIME ZONE 'UTC') as month,
  s.currency,
  COUNT(*)::integer as subscription_count,
  SUM(s.amount::numeric) as total_amount,
  SUM(s.normalized_monthly_amount::numeric) as normalized_monthly_amount
FROM subscriptions s
LEFT JOIN categories c ON s.category_id = c.id
WHERE s.deleted_at IS NULL
  AND s.status = 'active'
GROUP BY s.user_id, c.id, c.name, c.color, c.icon, month, s.currency;

-- Create unique index for REFRESH CONCURRENTLY
-- COALESCE handles NULL category_id (uncategorized subscriptions)
CREATE UNIQUE INDEX user_analytics_mv_unique_idx
ON user_analytics_mv (
  user_id,
  COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid),
  month,
  currency
);

-- Create additional indexes for query performance
CREATE INDEX user_analytics_mv_user_id_idx ON user_analytics_mv (user_id);
CREATE INDEX user_analytics_mv_month_idx ON user_analytics_mv (month);

-- Initial data population
REFRESH MATERIALIZED VIEW user_analytics_mv;
