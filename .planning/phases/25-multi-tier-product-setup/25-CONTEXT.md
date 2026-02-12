# Phase 25: Multi-Tier Product Setup - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up three subscription tiers in Stripe with correct pricing, tier-aware access mapping, and grandfathering support. Users can subscribe to one of three tiers. Feature gating and portal UI are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Tier naming & features
- Three tiers: Primary, Enhanced, Advanced
- No free tier — Primary is the lowest paid tier
- Differentiation by feature access (not limits)
- **Primary:** Subscription tracking (current app scope — imports, analytics, reminders)
- **Enhanced:** General banking (spending monitoring, budgets, debt management)
- **Advanced:** Full financial picture (investments, net worth tracking)

### Price points & intervals
- Monthly and annual billing intervals
- Annual discount: 2 months free (~17% off)
- Price progression: ~1.5x jumps between tiers (e.g., $5 / $8 / $12 monthly)
- Primary tier target: $3-5/month range
- Multi-currency: USD + EUR + GBP pricing

### Grandfathering behavior
- Existing subscribers locked at original price forever
- Track grandfathered status by Stripe price ID (old price IDs stay active)
- If user downgrades then upgrades: they get current price (lose grandfather status)
- Show grandfathered users their savings: "You pay $X (current price $Y)"

### Stripe product structure
- 3 separate Stripe products (one per tier)
- Each product has monthly + annual prices
- Products created manually in Stripe dashboard, IDs stored in app
- Price ID → tier mapping stored in database table
- Old price IDs kept active indefinitely for grandfathered users

### Claude's Discretion
- Exact price amounts within ranges discussed (e.g., $4 vs $5 for Primary)
- Database table schema for price-to-tier mapping
- Currency conversion approach (1:1 pricing vs purchasing power adjusted)
- Admin workflow for adding new price IDs when prices change

</decisions>

<specifics>
## Specific Ideas

- Tier progression reflects product vision: subscriptions → banking → full finances
- Primary should feel accessible ("impulse buy" range)
- Grandfathered users seeing their savings reinforces loyalty

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-multi-tier-product-setup*
*Context gathered: 2026-02-11*
