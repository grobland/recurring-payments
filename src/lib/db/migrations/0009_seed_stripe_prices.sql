-- Seed stripe_prices table with actual Stripe price IDs
-- Run with: npx drizzle-kit migrate

-- Primary tier - $4/€4/£3 monthly, $40/€40/£30 annual
INSERT INTO stripe_prices (stripe_price_id, tier, interval, currency, amount_cents, is_active)
VALUES
  ('price_1SzyyX9mtGAqVex4XKIwlmRM', 'primary', 'month', 'usd', 400, true),
  ('price_1Szyzs9mtGAqVex40bPI3SIw', 'primary', 'year', 'usd', 4000, true),
  ('price_1SzyyX9mtGAqVex4F27siUUa', 'primary', 'month', 'eur', 400, true),
  ('price_1Szz0T9mtGAqVex4BnttcUY7', 'primary', 'year', 'eur', 4000, true),
  ('price_1Szyz89mtGAqVex47oFAoTnP', 'primary', 'month', 'gbp', 300, true),
  ('price_1Szz019mtGAqVex4hgGbSnPe', 'primary', 'year', 'gbp', 3000, true),

  -- Enhanced tier - $7/€7/£5.50 monthly, $70/€70/£55 annual
  ('price_1Szz1u9mtGAqVex4SxtZd0U2', 'enhanced', 'month', 'usd', 700, true),
  ('price_1Szz2I9mtGAqVex4KVW4rJ97', 'enhanced', 'year', 'usd', 7000, true),
  ('price_1Szz359mtGAqVex4hYqMI1yk', 'enhanced', 'month', 'eur', 700, true),
  ('price_1Szz3X9mtGAqVex42KQrNpAg', 'enhanced', 'year', 'eur', 7000, true),
  ('price_1Szz2b9mtGAqVex4Y8bx6TDp', 'enhanced', 'month', 'gbp', 550, true),
  ('price_1Szz2k9mtGAqVex4cYhIIQfz', 'enhanced', 'year', 'gbp', 5500, true),

  -- Advanced tier - $11/€11/£8.50 monthly, $110/€110/£85 annual
  ('price_1Szz4K9mtGAqVex4mxTJFwjU', 'advanced', 'month', 'usd', 1100, true),
  ('price_1Szz4c9mtGAqVex4r1lAERaQ', 'advanced', 'year', 'usd', 11000, true),
  ('price_1Szz4v9mtGAqVex4TxtekBnb', 'advanced', 'month', 'eur', 1100, true),
  ('price_1Szz5N9mtGAqVex411bg6FkG', 'advanced', 'year', 'eur', 11000, true),
  ('price_1Szz6H9mtGAqVex4A7cCFZOa', 'advanced', 'month', 'gbp', 850, true),
  ('price_1Szz6R9mtGAqVex4ySuHCpG4', 'advanced', 'year', 'gbp', 8500, true)
ON CONFLICT (stripe_price_id) DO UPDATE SET
  tier = EXCLUDED.tier,
  interval = EXCLUDED.interval,
  currency = EXCLUDED.currency,
  amount_cents = EXCLUDED.amount_cents,
  is_active = EXCLUDED.is_active;
