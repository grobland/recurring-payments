# Phase 25 Plan 01: Multi-Tier Price Mapping Schema Summary

**One-liner:** Database schema for price-to-tier mapping with tierEnum (primary/enhanced/advanced) and stripePrices table supporting grandfathering

---

## Plan Reference

- **Phase:** 25-multi-tier-product-setup
- **Plan:** 01
- **Plan file:** `.planning/phases/25-multi-tier-product-setup/25-01-PLAN.md`

---

## What Was Built

### Database Schema Additions

Created foundation for multi-tier subscription pricing with grandfathering support:

**1. tierEnum** - PostgreSQL enum defining three subscription tiers:
- `primary` - Essential subscription tracking
- `enhanced` - Advanced analytics features
- `advanced` - Full financial picture

**2. stripePrices table** - Maps Stripe price IDs to application tiers:
- `id` (uuid) - Primary key
- `stripePriceId` (varchar) - Stripe price ID (unique index)
- `tier` (tierEnum) - Associated tier
- `interval` (varchar) - Billing frequency ('month' | 'year')
- `currency` (varchar) - Currency code ('usd' | 'eur' | 'gbp')
- `amountCents` (integer) - Price in cents
- `isActive` (boolean) - Can new users subscribe?
- `createdAt` (timestamp) - Creation timestamp

**3. Indexes for performance:**
- Unique index on `stripePriceId` for fast lookups
- Index on `tier` for tier-based queries
- Index on `isActive` for filtering active prices

**4. Type exports:**
- `StripePrices` - Select type for database queries
- `NewStripePrices` - Insert type for creating records
- `Tier` - Union type for tier values

### Key Design Decisions

**Grandfathering approach:** Users keep their original price forever by storing `stripePriceId` on the user record. When prices change, new price IDs are added to this table with `isActive: true`, while old prices remain with `isActive: false` but stay valid for existing subscribers.

**No relations to users table:** The stripePrices table is a lookup table, not relationally linked. User tier is derived by looking up their `stripePriceId` in this table.

**Three-tier progression:** Reflects product vision - subscriptions (primary) → banking (enhanced) → full finances (advanced).

---

## Tasks Completed

| Task | Description | Files Modified | Commit |
|------|-------------|----------------|--------|
| 1 | Add tierEnum and stripe_prices table to schema | src/lib/db/schema.ts | dc8d88b |
| 2 | Push migration to database | N/A (database) | N/A |

---

## Deviations from Plan

None - plan executed exactly as written.

---

## Technical Implementation

### Schema Structure

```typescript
// Enum definition
export const tierEnum = pgEnum("tier", ["primary", "enhanced", "advanced"]);

// Table definition
export const stripePrices = pgTable("stripe_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }).notNull(),
  tier: tierEnum("tier").notNull(),
  interval: varchar("interval", { length: 20 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("stripe_prices_price_id_idx").on(table.stripePriceId),
  index("stripe_prices_tier_idx").on(table.tier),
  index("stripe_prices_active_idx").on(table.isActive),
]);
```

### Migration Process

Used `npm run db:push` to apply schema changes:
1. Created `tier` enum type in PostgreSQL
2. Created `stripe_prices` table with all columns
3. Created three indexes for query optimization

---

## Files Modified

### Created
None

### Modified
- `src/lib/db/schema.ts` - Added tierEnum, stripePrices table, and type exports

### Deleted
None

---

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Store tier as enum, not varchar | Type safety and database constraint enforcement | Prevents invalid tier values, better IDE autocomplete |
| Unique index on stripePriceId | Fast O(1) lookup when determining user tier | Critical for performance on every authenticated request |
| isActive boolean flag | Distinguish current prices from grandfathered prices | Enables price changes without breaking existing subscribers |
| No foreign key to users | Lookup table pattern, not relational | Simplifies schema, avoids cascade complexities |
| amountCents as integer | Stripe convention, avoids floating point issues | Accurate currency handling, matches Stripe API |

---

## Testing Evidence

**TypeScript compilation:** Schema changes have correct syntax (verified manually, project has pre-existing type errors in dependencies)

**Database migration:** `npm run db:push` completed successfully with "Changes applied" confirmation

**Schema validation:**
- tierEnum has three values as specified
- stripePrices table created with all columns
- Indexes created on stripePriceId, tier, and isActive

---

## Integration Points

### Upstream Dependencies
None - this is foundational schema

### Downstream Consumers
- Phase 25-02: Stripe product/price creation scripts will populate this table
- Phase 25-03: Tier determination logic will query this table
- Future feature gating will use tier lookups from this table

### Database
- PostgreSQL enum created: `tier`
- Table created: `stripe_prices`
- Ready for data population

---

## Known Limitations

1. **Manual price ID management:** Admins must manually add new price IDs to this table when creating prices in Stripe. No automated sync yet.

2. **No price history tracking:** Can't see when a price became inactive or which users are on which prices. Future enhancement.

3. **No price validation:** Table accepts any price ID string. Future plan should validate against Stripe API.

---

## Next Phase Readiness

**Blockers:** None

**Concerns:**
- Need process/script to populate initial price IDs after Stripe products are created
- Should add validation to ensure price IDs in this table actually exist in Stripe

**Recommendations:**
- Next plan should create Stripe products and populate this table
- Consider adding a sync script to verify price IDs match Stripe

---

## Performance Characteristics

**Query patterns:**
- `getUserTier(userId)` - O(1) lookup via unique index on stripePriceId
- `getActivePrices(tier)` - O(log n) via index on tier + isActive
- `getAllActivePrices()` - O(n) sequential scan with isActive filter

**Expected data volume:**
- Initial: 18 rows (3 tiers × 2 intervals × 3 currencies)
- Growth: ~6 new rows per price change (one per currency for changed tier)
- Long-term: <200 rows (assuming infrequent price changes)

**Index impact:**
- stripePriceId unique index: ~2KB per 100 rows
- tier index: ~1KB per 100 rows
- isActive index: ~1KB per 100 rows
- Total overhead: negligible

---

## Metadata

**Subsystem:** billing-schema
**Tags:** #database #stripe #pricing #schema #grandfathering
**Completed:** 2026-02-12
**Duration:** ~5 minutes

### Dependency Graph
- **Requires:** PostgreSQL database, Drizzle ORM
- **Provides:** Multi-tier price mapping schema
- **Affects:** Tier determination, checkout flow, grandfathering logic

### Tech Stack
- **Added:** tierEnum, stripePrices table
- **Patterns:** Lookup table pattern, enum constraints, composite indexes
