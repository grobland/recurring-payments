# Phase 26: Feature Gating Infrastructure - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Build infrastructure to gate features by subscription tier and show upgrade prompts for locked features. Includes server-side utilities (`hasFeature()`, `requireFeature()`), client-side `FeatureGate` component, and trial experience handling. Enhanced and Advanced tier features are placeholders for future development.

</domain>

<decisions>
## Implementation Decisions

### Upgrade Prompt Behavior
- Modal dialog when user tries to access a locked feature
- Modal includes preview/screenshot of the locked feature
- Modal mentions the specific tier required ("Upgrade to Enhanced to unlock analytics")
- Upgrade button navigates to billing page (/settings/billing)
- Every upgrade prompt includes "compare all tiers" link

### Feature Configuration
- Claude's discretion on config location (TypeScript file vs database)
- All current functionality is Primary tier (no existing features are gated)
- Enhanced and Advanced features are placeholders from TIER_CONFIG in products.ts
- No usage limits between tiers - differentiate by features only

### Trial Experience
- Trial users get Primary tier access
- Show Enhanced/Advanced features as locked with upgrade prompts during trial
- Trial expiry results in read-only mode (can view but not add/edit)
- Show trial days remaining in sidebar/header (persistent indicator)

### Gating UX Patterns
- Locked navigation items appear grayed out (dimmed/disabled appearance)
- Dashboard widgets for locked features show placeholder card with "Upgrade to unlock" message
- Upgrade prompts show contextual, feature-specific benefits
- Always include "compare all tiers" link in upgrade prompts

### Claude's Discretion
- Feature-to-tier configuration storage location
- Modal preview/screenshot implementation details
- Trial days indicator exact placement and styling
- Placeholder card design for locked widgets

</decisions>

<specifics>
## Specific Ideas

- Tier features already defined in `src/lib/stripe/products.ts` (TIER_CONFIG)
- Primary: subscription tracking, PDF imports, analytics dashboard, email reminders, categories
- Enhanced: spending monitoring, budget management, debt tracking, transaction categorization
- Advanced: investment tracking, net worth dashboard, multi-account aggregation, goal planning
- Enhanced and Advanced features don't exist yet - just infrastructure for gating them

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 26-feature-gating*
*Context gathered: 2026-02-12*
