# Phase 39: Payment Type Selector - Research

**Researched:** 2026-02-26
**Domain:** URL-persisted filter state (nuqs), segmented control UI (shadcn/ui toggle-group), transaction classification
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Toggle Placement & Style**
- Segmented control (connected pill group, iOS-style) — active segment has filled background, others ghost/outline
- Positioned above all existing filters (search, date range, tag status)
- No transaction counts on segments — clean labels only
- Width at Claude's discretion based on layout

**Label Wording & Order**
- Four segments: All → Recurring → Subscriptions → One-time
- Full words, no abbreviations
- Order follows broadest-to-narrowest: All (everything) > Recurring (all repeating, includes subscriptions) > Subscriptions (confirmed recurring marked as subscription) > One-time (single payments)

**Classification Logic**
- **Recurring detection:** Pattern detection — analyze transaction history for repeating amounts/merchants at regular intervals, automatically flag as recurring
- **Subscription identification:** Auto-suggest + confirm — system detects likely subscriptions (known merchants like Netflix, Spotify, etc.) and suggests them; user confirms via checkbox
- **Combined flow:** Pattern detection and subscription suggestion happen together — when a recurring payment is detected AND the merchant matches a known service, the subscription checkbox is pre-checked with a "suggested" indicator
- **Inline checkbox:** Subscription toggle is visible directly on each recurring transaction row in the list, not hidden in a detail view

**Default & Empty States**
- Default selection: "All" on first page load (no URL param = All)
- Empty filter type: Show contextual empty state message (e.g., "No one-time payments found")
- Segments are never disabled — all four are always clickable
- No onboarding tooltip — UI should be self-explanatory

**Suggested Subscription Indicator**
- Auto-suggested but unconfirmed subscriptions have a subtle visual indicator (badge, dot, or different checkbox style)
- Confirmed subscriptions look different from suggested ones so users can review

### Claude's Discretion

- Segmented control width (fit-content vs full-width)
- Exact pattern detection algorithm/thresholds for recurring identification
- Known merchant list for subscription auto-suggestion
- Loading/transition states when switching segments
- Suggested indicator exact visual treatment (dot, badge, outline style)
- Error state handling

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FILTER-01 | User can toggle transaction types (Recurring/Subscriptions, One-time) on the Payment Type Selector page | Segmented control via shadcn toggle-group; classification logic via transactions table fields + recurringPatterns join |
| FILTER-02 | Selected type filters persist in the URL (nuqs shallow updates, no scroll reset) | nuqs v2 `useQueryState` with `parseAsStringLiteral`, shallow=true (default), NuqsAdapter in providers |
| FILTER-03 | Type filters combine with existing tag status, date range, and search filters | New `paymentType` field added to `TransactionFilters` type and API route conditions; filters are AND-combined |

</phase_requirements>

## Summary

Phase 39 adds a payment type filter (All / Recurring / Subscriptions / One-time) to the Payments transactions page. The filter is a segmented control above existing filters, with state persisted in the URL via nuqs shallow routing — so switching segments does not reset the virtualized list scroll position.

The critical architectural decision is how to classify transactions into "recurring" vs "subscriptions" vs "one-time". The existing `transactions` table has no `isRecurring` column. However, it has two signals available: `tagStatus` (which includes `"potential_subscription"` and `"converted"`) and `convertedToSubscriptionId` (a direct FK to a subscription). The `recurringPatterns` table stores pattern data by merchant name, making it joinable in the API query. Subscription auto-suggestion can leverage the existing `CATEGORY_KEYWORDS` merchant list in `category-guesser.ts` as a known-subscription merchant allowlist.

nuqs is NOT yet installed in this project. Version `^2.8.8` is the pre-decided choice (from STATE.md). The NuqsAdapter must be added to `src/app/providers.tsx` (or `src/app/layout.tsx`). The shadcn/ui `toggle-group` component does not exist in the project yet — it requires `@radix-ui/react-toggle-group` as a dependency.

**Primary recommendation:** Add `nuqs@^2.8.8` and the shadcn `toggle-group` component; implement classification using existing DB fields (`tagStatus`, `convertedToSubscriptionId`, merchant-name join against `recurringPatterns`); extend the transactions API with a `paymentType` filter param; wire the segmented control to `useQueryState` with `parseAsStringLiteral`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nuqs | ^2.8.8 | URL-persisted query state | Pre-decided in STATE.md; type-safe alternative to useSearchParams + router.push |
| @radix-ui/react-toggle-group | (via shadcn) | Segmented control primitive | shadcn's standard for toggle groups; already use Radix for all UI primitives |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui toggle-group component | (shadcn add) | Styled wrapper around Radix toggle group | Use for the segmented control UI |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nuqs | useSearchParams + router.push manually | nuqs provides type-safety, shallow updates, and scroll-reset prevention; manual approach requires boilerplate and risks scroll reset |
| shadcn toggle-group | Custom button group with CSS | Toggle-group is already Radix-based, consistent with project UI system |
| DB join for recurring detection | Client-side filter after loading all data | DB-side filter is correct for cursor-based pagination — client-side would break pagination |

**Installation:**
```bash
npm install nuqs@^2.8.8
npx shadcn@latest add toggle-group
```

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Changes are:

```
src/
├── app/
│   └── providers.tsx          # Add NuqsAdapter here
├── types/
│   └── transaction.ts         # Add paymentType to TransactionFilters
├── components/transactions/
│   ├── payment-type-selector.tsx   # NEW: segmented control component
│   ├── transaction-browser.tsx     # Replace useState with useQueryState for paymentType
│   └── transaction-filters.tsx     # Extend to include paymentType display (or keep separate above filters)
├── lib/hooks/
│   └── use-transactions.ts    # Add paymentType to URLSearchParams builder
└── app/api/transactions/
    └── route.ts               # Add paymentType filter condition
```

### Pattern 1: NuqsAdapter in Providers

**What:** Wrap children with `NuqsAdapter` so all child components can use `useQueryState`.
**When to use:** Required once at root level for nuqs to work in App Router.

```typescript
// Source: https://nuqs.dev/docs/adapters
// src/app/providers.tsx
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export function Providers({ children }: ProvidersProps) {
  // ...existing providers...
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <ThemeProvider ...>
            {children}
            <Toaster ... />
          </ThemeProvider>
        </NuqsAdapter>
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

### Pattern 2: useQueryState with parseAsStringLiteral

**What:** Type-safe URL query param for a fixed set of string values. Default value ("all") is excluded from the URL (clearOnDefault: true is the nuqs v2 default).
**When to use:** When filter value is one of a fixed set of string literals.

```typescript
// Source: nuqs.dev/docs/parsers
import { useQueryState, parseAsStringLiteral } from 'nuqs';

const PAYMENT_TYPES = ['all', 'recurring', 'subscriptions', 'one-time'] as const;
type PaymentType = typeof PAYMENT_TYPES[number];

// In component:
const [paymentType, setPaymentType] = useQueryState(
  'paymentType',
  parseAsStringLiteral(PAYMENT_TYPES).withDefault('all')
);
// URL: ?paymentType=recurring (absent when 'all', because clearOnDefault=true by default)
```

**Key behavior:**
- `shallow: true` (default in nuqs v2) — URL updates without triggering Next.js server re-render, so virtualizer scroll position is preserved
- `clearOnDefault: true` (default in nuqs v2) — when user selects "all", param is removed from URL (clean URLs)
- `history: 'replace'` (default) — switching tabs doesn't pollute browser history

### Pattern 3: Transaction Classification in API

**What:** The `/api/transactions` route needs to understand `paymentType` and translate it to DB conditions.
**When to use:** Filter must be applied server-side because pagination uses cursor-based keyset pagination — client-side filtering would break page counts.

Classification mapping using existing schema fields:

| paymentType param | DB condition |
|-------------------|-------------|
| `all` (or absent) | No additional condition |
| `recurring` | Merchant name appears in `recurringPatterns` for this user (JOIN), OR `tagStatus IN ('potential_subscription', 'converted')` |
| `subscriptions` | `convertedToSubscriptionId IS NOT NULL` OR (`tagStatus = 'converted'`) |
| `one-time` | Merchant name NOT in `recurringPatterns` AND `tagStatus NOT IN ('potential_subscription', 'converted')` AND `convertedToSubscriptionId IS NULL` |

**Critical Note:** The existing `recurringPatterns` table is populated from `subscriptions` renewal history (not from raw transactions). This means a newly-imported transaction whose merchant matches a recurring pattern will only be classified as "recurring" if the merchant exists in `recurringPatterns`. This is the correct behavior and consistent with the described classification logic.

### Pattern 4: Inline Subscription Checkbox on Transaction Row

**What:** Each transaction row in the "recurring" view shows a checkbox to mark it as a subscription.
**When to use:** When `paymentType === 'recurring'`.

The checkbox state maps to:
- Checked = confirmed subscription (`convertedToSubscriptionId` set OR `tagStatus === 'converted'`)
- Pre-checked but indicated = auto-suggested (`tagStatus === 'potential_subscription'` AND merchant in known list)
- Unchecked = plain recurring (no subscription link)

Toggle action: Call `PATCH /api/transactions/:id` to update `tagStatus` to `"converted"` or revert to `"potential_subscription"`. This is an extension of the existing tag system.

### Pattern 5: PaymentTypeSelector Component

**What:** Segmented control above existing filters in `TransactionFilters` or `TransactionBrowser`.
**Placement:** The locked decision is "above all existing filters", so it renders before `<TransactionFilters>` inside `<TransactionBrowser>`.

```tsx
// src/components/transactions/payment-type-selector.tsx
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface PaymentTypeSelectorProps {
  value: PaymentType;
  onChange: (value: PaymentType) => void;
}

export function PaymentTypeSelector({ value, onChange }: PaymentTypeSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => { if (v) onChange(v as PaymentType); }}
      className="w-fit"
    >
      <ToggleGroupItem value="all">All</ToggleGroupItem>
      <ToggleGroupItem value="recurring">Recurring</ToggleGroupItem>
      <ToggleGroupItem value="subscriptions">Subscriptions</ToggleGroupItem>
      <ToggleGroupItem value="one-time">One-time</ToggleGroupItem>
    </ToggleGroup>
  );
}
```

**Width decision:** `w-fit` (Claude's discretion) — the control should be as wide as its content, not full-width, to maintain a clean header layout.

### Anti-Patterns to Avoid

- **Don't filter client-side after fetch:** The transaction list uses cursor-based infinite pagination. Filtering after fetch would show fewer than PAGE_SIZE results per page and break "load more" behavior. Filtering MUST happen in the API.
- **Don't use `router.push()` for filter updates:** This triggers a full navigation and resets scroll. Use nuqs `useQueryState` which does shallow URL updates by default.
- **Don't use `useSearchParams()` + `router.push/replace()` manually:** nuqs already handles this correctly with scroll preservation.
- **Don't add `paymentType` to the `TransactionFilters` state in `TransactionBrowser`:** The `paymentType` lives in the URL via nuqs; it feeds into `debouncedFilters` as a derived value alongside the other existing filters. Keep nuqs state and component filter state coordinated.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL query param sync | Custom useSearchParams wrapper | nuqs `useQueryState` | nuqs handles history, serialization, scroll preservation, default value cleanup, throttling |
| Segmented control | Custom button group with manual active state | shadcn `toggle-group` | Radix handles keyboard navigation, a11y, single/multi select modes |
| Known merchant detection | Custom keyword list | Extend existing `CATEGORY_KEYWORDS` in `category-guesser.ts` | Already has 100+ merchants across streaming, software, music, gaming categories |

**Key insight:** The project already has the merchant keyword infrastructure (`category-guesser.ts`) and pattern data (`recurringPatterns` table). Phase 39 reuses both; it does not build new detection infrastructure.

## Common Pitfalls

### Pitfall 1: NuqsAdapter Missing — Silent Failure
**What goes wrong:** `useQueryState` silently falls back to `null` values with no error. The segmented control appears to work but URL never updates.
**Why it happens:** nuqs v2 requires the adapter in the provider tree; without it the hook has no context.
**How to avoid:** Add `NuqsAdapter` to `providers.tsx` as the first task in Wave 1.
**Warning signs:** `paymentType` is always `null` regardless of segment clicks.

### Pitfall 2: Scroll Reset on Filter Change
**What goes wrong:** Switching payment type segments scrolls the virtualized list back to top.
**Why it happens:** Using `router.push()` or `router.replace()` triggers React re-render and loses virtualizer state.
**How to avoid:** Use nuqs exclusively — its default `shallow: true` prevents this.
**Warning signs:** Scroll position resets on each segment click.

### Pitfall 3: ToggleGroup Uncontrolled → No-op on Deselect
**What goes wrong:** Clicking the currently-selected segment deselects it, setting value to `""`, which is not a valid PaymentType.
**Why it happens:** Radix `ToggleGroup type="single"` allows deselecting the active item (value becomes `""`).
**How to avoid:** Guard `onValueChange` — if the new value is falsy, ignore the update (keep current selection).
```tsx
onValueChange={(v) => { if (v) onChange(v as PaymentType); }}
```
**Warning signs:** All filter disappears when clicking the active segment.

### Pitfall 4: Client-Side Filtering Breaking Pagination
**What goes wrong:** Filtering by paymentType client-side shows fewer than 50 results per page; "load more" never triggers.
**Why it happens:** Client-side filtering after fetch returns e.g. 5 "one-time" transactions from a 50-item page, but the virtualizer sees 5 items and doesn't reach the IntersectionObserver trigger.
**How to avoid:** Always pass `paymentType` as a query param to `/api/transactions` and filter in the DB query.
**Warning signs:** Payment type filter seems to work but page loads show inconsistent counts.

### Pitfall 5: recurringPatterns Table Scope Mismatch
**What goes wrong:** `recurringPatterns` are detected from `subscriptions` renewal data (the `subscriptions` table), NOT from raw `transactions`. A merchant like "Netflix" will only appear in `recurringPatterns` if the user has at least 2 imported subscription renewals for it.
**Why it happens:** The existing pattern detection query in `/api/patterns/detect` runs against `subscriptions.last_renewal_date`, not `transactions`.
**How to avoid:** For the "recurring" filter, use a LEFT JOIN on `recurringPatterns` by matching `LOWER(transactions.merchantName)` against `LOWER(recurringPatterns.merchantName)` for the same `userId`. Accept that transactions with no pattern history are classified as "one-time" until patterns are detected.
**Warning signs:** New users with fresh imports see all transactions as "one-time" — this is EXPECTED behavior.

### Pitfall 6: Toggle Group Not in shadcn Component Library
**What goes wrong:** `import { ToggleGroup } from "@/components/ui/toggle-group"` fails with module not found.
**Why it happens:** shadcn components must be explicitly added to the project; they are not auto-installed.
**How to avoid:** Run `npx shadcn@latest add toggle-group` before writing the component. This installs `@radix-ui/react-toggle-group` and creates `src/components/ui/toggle-group.tsx`.
**Warning signs:** TypeScript error on import, or file missing from `src/components/ui/`.

## Code Examples

Verified patterns from official sources:

### nuqs Installation and Setup

```bash
# Install nuqs
npm install nuqs@^2.8.8

# Add toggle-group shadcn component (installs @radix-ui/react-toggle-group)
npx shadcn@latest add toggle-group
```

### NuqsAdapter in providers.tsx

```typescript
// Source: https://nuqs.dev/docs/adapters
"use client";

import { NuqsAdapter } from 'nuqs/adapters/next/app';
// ...existing imports...

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({ ... }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </NuqsAdapter>
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

### Payment Type State with nuqs

```typescript
// Source: https://nuqs.dev/docs/parsers (parseAsStringLiteral)
import { useQueryState, parseAsStringLiteral } from 'nuqs';

export const PAYMENT_TYPES = ['all', 'recurring', 'subscriptions', 'one-time'] as const;
export type PaymentType = typeof PAYMENT_TYPES[number];

// In TransactionBrowser (replaces manual useState for paymentType):
const [paymentType, setPaymentType] = useQueryState(
  'paymentType',
  parseAsStringLiteral(PAYMENT_TYPES).withDefault('all')
  // shallow: true (default) — no scroll reset
  // clearOnDefault: true (default) — URL is clean when "all" selected
  // history: 'replace' (default) — no history spam
);
```

### TransactionFilters Type Extension

```typescript
// src/types/transaction.ts — add paymentType field
export type PaymentType = 'all' | 'recurring' | 'subscriptions' | 'one-time';

export interface TransactionFilters {
  sourceType?: string;
  tagStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  accountId?: string;
  paymentType?: PaymentType;  // NEW
}
```

### API Route Filter Condition (transactions/route.ts)

```typescript
// Add paymentType param parsing
const paymentType = searchParams.get("paymentType"); // 'all' | 'recurring' | 'subscriptions' | 'one-time' | null

// Recurring: JOIN recurringPatterns by merchant name
// Subscriptions: convertedToSubscriptionId IS NOT NULL OR tagStatus = 'converted'
// One-time: NOT recurring AND NOT subscription

if (paymentType === 'subscriptions') {
  conditions.push(
    or(
      isNotNull(transactions.convertedToSubscriptionId),
      eq(transactions.tagStatus, 'converted')
    )!
  );
} else if (paymentType === 'recurring') {
  // Requires LEFT JOIN on recurringPatterns:
  // WHERE recurringPatterns.id IS NOT NULL (merchant matched a pattern)
  // OR tagStatus IN ('potential_subscription', 'converted')
  // This is handled via a subquery or JOIN condition added to the query
} else if (paymentType === 'one-time') {
  // recurringPatterns.id IS NULL AND tagStatus NOT IN ('potential_subscription','converted')
  // AND convertedToSubscriptionId IS NULL
}
```

**Note on recurring JOIN:** The API currently has two query branches (with/without sourceType). Adding a recurringPatterns join requires a third dimension. The cleanest approach is to refactor to a single query builder that appends conditions, then applies the appropriate JOIN conditions for the paymentType filter.

### Inline Subscription Checkbox (TransactionRow extension)

```tsx
// Shown when paymentType === 'recurring'
// isSubscriptionSuggested: tagStatus === 'potential_subscription' AND merchant is known
// isSubscriptionConfirmed: convertedToSubscriptionId IS NOT NULL

<Checkbox
  checked={isSubscriptionConfirmed || isSubscriptionSuggested}
  // Distinct visual for suggested vs confirmed:
  // suggested: data-suggested="true" for CSS styling or Badge overlay
  onCheckedChange={(checked) => handleSubscriptionToggle(transaction.id, checked)}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useSearchParams + router.push | nuqs useQueryState | nuqs v2 (2024) | Eliminates scroll reset on filter change; type-safe |
| Radio button group | Radix ToggleGroup via shadcn | shadcn v2+ | Accessible, keyboard-navigable segmented control |
| Client-side filter | Server-side filter via API param | N/A (always best) | Required for correct infinite-scroll pagination |

**Deprecated/outdated:**
- `throttleMs` option in nuqs: replaced by `limitUrlUpdates: throttle(N)` in nuqs v2.5.0. Use `withOptions({ limitUrlUpdates: ... })` if needed for debouncing.

## Open Questions

1. **recurringPatterns JOIN complexity in API route**
   - What we know: The current API has two branches (sourceType filter vs no sourceType). A recurring/one-time filter requires joining `recurringPatterns` on `merchantName`.
   - What's unclear: Whether to refactor the two-branch pattern into a single query builder, or add a third layer of branching.
   - Recommendation: Refactor to a single Drizzle query with conditions array; add LEFT JOIN to recurringPatterns only when `paymentType` is `recurring` or `one-time`. This eliminates the branching anti-pattern.

2. **Subscription auto-suggest threshold for inline checkbox**
   - What we know: `CATEGORY_KEYWORDS` has ~100+ merchants. A transaction whose merchant matches will be "suggested".
   - What's unclear: Should the suggested indicator appear in the filter view for ALL transactions, or only when `paymentType === 'recurring'`?
   - Recommendation: Show the inline subscription checkbox only in the `recurring` segment view (where it's most actionable); hide it in `all` and `subscriptions` views to avoid clutter.

3. **`paymentType` param scope in `AccountTransactionsTab`**
   - What we know: `AccountTransactionsTab` uses its own local filter state and does NOT use nuqs.
   - What's unclear: Should the account detail transactions tab also get a payment type filter?
   - Recommendation: Phase 39 scope is the Payments page only (`TransactionBrowser`). `AccountTransactionsTab` is out of scope. CONTEXT.md says Phase 39 target is the "Payments page transaction browser."

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` (only `workflow.research: true` is set). Skipping this section.

## Sources

### Primary (HIGH confidence)
- https://nuqs.dev/docs/adapters — NuqsAdapter setup for Next.js App Router
- https://nuqs.dev/docs/parsers — parseAsStringLiteral, withDefault pattern
- https://nuqs.dev/docs/options — shallow, clearOnDefault, history options
- https://ui.shadcn.com/docs/components/toggle-group — ToggleGroup component API
- `src/lib/db/schema.ts` (local) — transactions table fields, recurringPatterns table
- `src/app/api/transactions/route.ts` (local) — existing filter implementation
- `src/types/transaction.ts` (local) — TransactionFilters type
- `.planning/STATE.md` (local) — nuqs@^2.8.8 pre-decided version

### Secondary (MEDIUM confidence)
- https://github.com/47ng/nuqs — nuqs repository (confirmed v2 stable, Next.js 14.2+ support)
- `src/lib/utils/category-guesser.ts` (local) — CATEGORY_KEYWORDS merchant list for subscription auto-suggest
- `src/app/api/patterns/detect/route.ts` (local) — confirmed recurringPatterns uses subscriptions table, NOT transactions

### Tertiary (LOW confidence)
- WebSearch results for nuqs v2 + shadcn toggle-group — installation commands confirmed working per multiple sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nuqs pre-decided in STATE.md, shadcn toggle-group confirmed from official docs
- Architecture: HIGH — existing codebase patterns clearly show how filters plug in; API route structure is well-understood
- Pitfalls: HIGH — discovered from direct schema inspection (no isRecurring column, recurringPatterns scoped to subscriptions not transactions)

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days; nuqs is stable, shadcn/ui is stable)
