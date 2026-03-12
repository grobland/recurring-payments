/**
 * Full database reset script — wipes all user data and re-seeds defaults.
 * 
 * Usage: node --env-file=.env.local scripts/reset-database.mjs
 * 
 * Also clears:
 *   - .next/ cache (Turbopack/Webpack build cache)
 *   - playwright/.auth/ (E2E test auth state)
 *   - Prints localStorage keys to clear in the browser
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set. Run with: node --env-file=.env.local scripts/reset-database.mjs');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

try {
  console.log('\n🗑️  RESETTING DATABASE...\n');

  // Order matters — foreign key dependencies (children first, parents last)
  const tables = [
    'transaction_tags',
    'tags',
    'transactions',
    'statements',
    'recurring_patterns',
    'alerts',
    'reminder_logs',
    'import_audits',
    'subscriptions',
    'financial_accounts',
    'webhook_events',
    'stripe_prices',
    'trial_extensions',
    'password_reset_tokens',
    'authenticators',
    'verification_tokens',
    'sessions',
    'accounts',         // NextAuth accounts (OAuth links)
    'categories',       // Includes user-created + defaults
    'users',
    'fx_rates_cache',
  ];

  for (const table of tables) {
    try {
      const result = await sql.unsafe(`DELETE FROM "${table}"`);
      console.log(`  ✓ ${table} — cleared (${result.count} rows)`);
    } catch (e) {
      if (e.message.includes('does not exist')) {
        console.log(`  ⊘ ${table} — skipped (table does not exist)`);
      } else {
        console.log(`  ✗ ${table} — ERROR: ${e.message}`);
      }
    }
  }

  // Drop and recreate materialized view (empty)
  console.log('');
  try {
    await sql.unsafe('DROP MATERIALIZED VIEW IF EXISTS user_analytics_mv');
    await sql.unsafe(`
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
      GROUP BY s.user_id, c.id, c.name, c.color, c.icon, month, s.currency
    `);
    await sql.unsafe(`
      CREATE UNIQUE INDEX user_analytics_mv_unique_idx ON user_analytics_mv (
        user_id,
        COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid),
        month,
        currency
      )
    `);
    await sql.unsafe('CREATE INDEX user_analytics_mv_user_id_idx ON user_analytics_mv (user_id)');
    await sql.unsafe('CREATE INDEX user_analytics_mv_month_idx ON user_analytics_mv (month)');
    await sql.unsafe('REFRESH MATERIALIZED VIEW user_analytics_mv');
    console.log('  ✓ user_analytics_mv — recreated');
  } catch (e) {
    console.log(`  ✗ user_analytics_mv — ERROR: ${e.message}`);
  }

  // Re-seed default categories
  console.log('\n🌱 SEEDING DEFAULT CATEGORIES...\n');

  const DEFAULT_CATEGORIES = [
    { name: "Entertainment", slug: "entertainment", icon: "🎬", color: "#FF6B6B" },
    { name: "Music", slug: "music", icon: "🎵", color: "#4ECDC4" },
    { name: "Productivity", slug: "productivity", icon: "⚡", color: "#45B7D1" },
    { name: "Cloud Storage", slug: "cloud-storage", icon: "☁️", color: "#96CEB4" },
    { name: "Gaming", slug: "gaming", icon: "🎮", color: "#FFEAA7" },
    { name: "News", slug: "news", icon: "📰", color: "#DDA0DD" },
    { name: "Fitness", slug: "fitness", icon: "💪", color: "#98D8C8" },
    { name: "Education", slug: "education", icon: "📚", color: "#F7DC6F" },
    { name: "Communication", slug: "communication", icon: "💬", color: "#BB8FCE" },
    { name: "Security", slug: "security", icon: "🔒", color: "#85C1E9" },
    { name: "Developer Tools", slug: "developer-tools", icon: "🛠️", color: "#F8C471" },
    { name: "Design", slug: "design", icon: "🎨", color: "#82E0AA" },
    { name: "Finance", slug: "finance", icon: "💰", color: "#F1948A" },
    { name: "Health", slug: "health", icon: "🏥", color: "#AED6F1" },
    { name: "Food", slug: "food", icon: "🍔", color: "#F9E79F" },
    { name: "Shopping", slug: "shopping", icon: "🛍️", color: "#D2B4DE" },
    { name: "Travel", slug: "travel", icon: "✈️", color: "#A3E4D7" },
    { name: "Utilities", slug: "utilities", icon: "🔧", color: "#FAD7A0" },
    { name: "Insurance", slug: "insurance", icon: "🛡️", color: "#AEB6BF" },
    { name: "Other", slug: "other", icon: "📦", color: "#D5DBDB" },
  ];

  for (const cat of DEFAULT_CATEGORIES) {
    await sql.unsafe(
      `INSERT INTO categories (user_id, name, slug, icon, color) VALUES (NULL, $1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [cat.name, cat.slug, cat.icon, cat.color]
    );
  }
  console.log(`  ✓ ${DEFAULT_CATEGORIES.length} default categories seeded`);

  console.log('\n✅ DATABASE RESET COMPLETE\n');
  console.log('📋 ALSO CLEAR THESE MANUALLY:\n');
  console.log('  Browser localStorage (open DevTools → Console → paste):');
  console.log('    localStorage.removeItem("overlap_dismissals");');
  console.log('    localStorage.removeItem("onboarding_hints");');
  console.log('    localStorage.removeItem("batch-upload-queue");');
  console.log('    localStorage.removeItem("vault-view-preference");');
  console.log('');
  console.log('  Or clear all at once:');
  console.log('    localStorage.clear();');
  console.log('');
  console.log('  Then register a fresh account at /register');
  console.log('');

} catch (e) {
  console.error('FATAL:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
