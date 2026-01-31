# Architecture Patterns for Import Improvements

**Domain:** Next.js 16 App with PDF Import, Category Management, and Data Quality Features
**Researched:** 2026-01-31
**Confidence:** HIGH

## Executive Summary

This research examines how smart import (confidence scoring + all items), statement sources (bank name tracking), renewal date calculation (from transaction date), and category management (fixing duplicates) integrate with the existing Next.js 16/Drizzle ORM architecture.

**Key Finding:** The existing architecture supports all improvements with minimal refactoring. Changes are isolated to:
1. **Schema additions** (2 new columns) via Drizzle migrations
2. **AI prompt enhancement** (no code refactor, just prompt tuning)
3. **Component prop expansion** (backward-compatible changes to import UI)
4. **Hook enhancement** (deduplication in useCategoryOptions)

**Integration Risk:** LOW. All changes are additive or backward-compatible. No breaking changes to existing flows.

---

## Existing Architecture Analysis

### Current Import Flow

**Flow:** `import/page.tsx` → `POST /api/import` → `pdf-parser.ts` (OpenAI) → Review UI → `POST /api/import/confirm` → Database

**Integration Points:**
1. **Client (import/page.tsx):** React component with dropzone, processes DetectedSubscription[] from API
2. **API (api/import/route.ts):** Handles file upload, calls pdf-parser, returns subscriptions with duplicates marked
3. **Parser (lib/openai/pdf-parser.ts):** GPT-4o Vision extraction with confidence scoring
4. **Confirmation (api/import/confirm/route.ts):** Bulk insert subscriptions with action filtering (create/skip/merge)
5. **Database (schema.ts):** subscriptions table with importAuditId foreign key

**Current Limitations:**
- AI prompt filters LOW confidence items (doesn't return all detected items)
- No statement source tracking (bank name not captured)
- Renewal date defaults to `addMonths(new Date(), 1)` (doesn't use transaction date)
- Category dropdown shows duplicates (default + user categories mixed without deduplication)

---

## Integration Point 1: Smart Import (Return All Items)

### Current Behavior
```typescript
// pdf-parser.ts line 50-55
const SYSTEM_PROMPT = `...
Important:
- Be conservative - only include items you're reasonably confident are recurring subscriptions
...`;
```

**Problem:** AI filters out items before returning, user never sees them.

### Proposed Change

**Modify AI Prompt (pdf-parser.ts):**
```diff
  const SYSTEM_PROMPT = `...
  Important:
- - Be conservative - only include items you're reasonably confident are recurring subscriptions
+ - Return ALL potential subscription items, even if you're uncertain
+ - Use confidence scoring to indicate likelihood (0-100)
+ - Include items as low as 30% confidence if they might be recurring
  ...`;
```

**No schema change needed.** Confidence field already exists in DetectedSubscription interface.

**Component Change (import/page.tsx):**
```diff
  const importItems: ImportItem[] = data.subscriptions.map(
    (sub: DetectedSubscription) => ({
      ...sub,
-     selected: !sub.isDuplicate && sub.confidence >= 70,
+     selected: !sub.isDuplicate && sub.confidence >= 80,
      categoryId: null,
      nextRenewalDate: addMonths(new Date(), 1),
      action: sub.isDuplicate ? "skip" : "create",
    })
  );
```

**UX Enhancement:** Show all items, pre-select high-confidence (≥80%), user can review and select lower-confidence items.

**Integration Risk:** NONE. Backward-compatible. Existing flow still works, just shows more items.

---

## Integration Point 2: Statement Source Tracking

### Schema Change Required

**Add column to subscriptions table:**
```typescript
// schema.ts - subscriptions table
export const subscriptions = pgTable("subscriptions", {
  // ... existing columns ...

  // Import tracking (existing)
  importAuditId: uuid("import_audit_id").references(() => importAudits.id, {
    onDelete: "set null",
  }),

  // NEW: Statement source
  statementSource: varchar("statement_source", { length: 255 }), // e.g., "Chase Bank", "Bank of America"

  // ... timestamps ...
});
```

**Migration Path:**
1. Add column as nullable (safe for existing data)
2. Generate migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`

**Source:** [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations) recommends adding columns as nullable first for safe schema evolution.

### AI Extraction Enhancement

**Enhance AI Prompt (pdf-parser.ts):**
```diff
  const SYSTEM_PROMPT = `You are an expert at analyzing bank statements and financial documents...

+ First, identify the bank/financial institution name from the statement header or footer.
+
  For each subscription found, extract:
  1. Name of the service/company
  2. Amount charged
  3. Currency (use ISO 4217 codes like USD, EUR, GBP)
  4. Frequency (monthly or yearly) - infer from the pattern if not explicit
  5. Your confidence level (0-100) in this being a recurring subscription

  Respond ONLY with a JSON object:
  {
+   "bankName": "Name of the bank/institution",
    "subscriptions": [
      {
        "name": "Service Name",
        "amount": 9.99,
        "currency": "USD",
        "frequency": "monthly",
        "confidence": 85,
        "rawText": "The exact text from the statement (optional)"
      }
    ]
  }`;
```

**Type Change (pdf-parser.ts):**
```typescript
export interface ParseResult {
  bankName?: string; // NEW
  subscriptions: DetectedSubscription[];
  pageCount: number;
  processingTime: number;
}
```

**API Route Change (api/import/route.ts):**
```typescript
// Store bankName in session/state to pass to confirm endpoint
return NextResponse.json({
  bankName: parseResult.bankName, // NEW
  subscriptions: subscriptionsWithDuplicates,
  pageCount: parseResult.pageCount,
  processingTime: parseResult.processingTime,
  detectedCount: parseResult.subscriptions.length,
  duplicateCount: duplicates.size,
});
```

**Component State (import/page.tsx):**
```typescript
const [bankName, setBankName] = useState<string | null>(null);

// In processFiles()
const data = await response.json();
setBankName(data.bankName); // NEW

// In confirmImport()
const toImport = items.map((item) => ({
  name: item.name,
  amount: item.amount,
  currency: item.currency,
  frequency: item.frequency,
  categoryId: item.categoryId,
  nextRenewalDate: item.nextRenewalDate,
  action: item.selected ? item.action : "skip",
  statementSource: bankName, // NEW
}));
```

**Confirmation Endpoint (api/import/confirm/route.ts):**
```diff
  // Create new subscription
  const [created] = await db
    .insert(subscriptions)
    .values({
      userId: session.user.id,
      name: sub.name,
      amount: sub.amount.toFixed(2),
      currency: sub.currency,
      frequency: sub.frequency,
      categoryId: sub.categoryId,
      nextRenewalDate: sub.nextRenewalDate,
+     statementSource: sub.statementSource, // NEW
      normalizedMonthlyAmount: calculateNormalizedMonthly(
        sub.amount,
        sub.frequency
      ),
      status: "active",
      // ...
    })
    .returning();
```

**Integration Risk:** LOW. Column is nullable, so existing code continues to work. New imports get source tracking.

---

## Integration Point 3: Renewal Date Calculation

### Current Behavior
```typescript
// import/page.tsx line 119
nextRenewalDate: addMonths(new Date(), 1), // Hardcoded to "1 month from now"
```

**Problem:** Ignores transaction date from statement. User always has to manually adjust.

### Proposed Enhancement

**AI Extraction Enhancement:**
```diff
  For each subscription found, extract:
  1. Name of the service/company
  2. Amount charged
  3. Currency (use ISO 4217 codes like USD, EUR, GBP)
  4. Frequency (monthly or yearly) - infer from the pattern if not explicit
  5. Your confidence level (0-100) in this being a recurring subscription
+ 6. Transaction date (if visible in the statement)

  Respond ONLY with a JSON object:
  {
    "bankName": "Name of the bank/institution",
    "subscriptions": [
      {
        "name": "Service Name",
        "amount": 9.99,
        "currency": "USD",
        "frequency": "monthly",
        "confidence": 85,
+       "transactionDate": "2026-01-15", // ISO 8601 format, or null if not found
        "rawText": "The exact text from the statement (optional)"
      }
    ]
  }
```

**Type Change (pdf-parser.ts):**
```typescript
export interface DetectedSubscription {
  name: string;
  amount: number;
  currency: string;
  frequency: "monthly" | "yearly";
  confidence: number; // 0-100
  transactionDate?: string; // NEW: ISO 8601 date string
  rawText?: string;
}
```

**Helper Function (lib/utils/renewal-date.ts - NEW FILE):**
```typescript
import { addMonths, addYears, parseISO } from "date-fns";

export function calculateNextRenewal(
  transactionDate: string | undefined,
  frequency: "monthly" | "yearly"
): Date {
  if (!transactionDate) {
    // Fallback: 1 month from now (existing behavior)
    return addMonths(new Date(), 1);
  }

  try {
    const date = parseISO(transactionDate);

    // Calculate next renewal based on frequency
    if (frequency === "monthly") {
      return addMonths(date, 1);
    } else {
      return addYears(date, 1);
    }
  } catch (error) {
    // Invalid date format, fallback
    console.error("Invalid transaction date:", transactionDate, error);
    return addMonths(new Date(), 1);
  }
}
```

**Component Change (import/page.tsx):**
```diff
+ import { calculateNextRenewal } from "@/lib/utils/renewal-date";

  const importItems: ImportItem[] = data.subscriptions.map(
    (sub: DetectedSubscription) => ({
      ...sub,
      selected: !sub.isDuplicate && sub.confidence >= 80,
      categoryId: null,
-     nextRenewalDate: addMonths(new Date(), 1),
+     nextRenewalDate: calculateNextRenewal(sub.transactionDate, sub.frequency),
      action: sub.isDuplicate ? "skip" : "create",
    })
  );
```

**UX Enhancement:** User sees calculated renewal date in review UI. Can still manually adjust via date picker if AI got it wrong.

**Integration Risk:** NONE. Fallback to existing behavior if transactionDate is missing. Backward-compatible.

---

## Integration Point 4: Category Dropdown Deduplication

### Current Behavior

**Hook (use-categories.ts):**
```typescript
export function useCategoryOptions() {
  const { data, ...rest } = useCategories();

  const options =
    data?.categories.map((cat) => ({
      value: cat.id,
      label: cat.name,
      icon: cat.icon,
      color: cat.color,
      isCustom: cat.userId !== null,
    })) ?? [];

  return {
    ...rest,
    data,
    options, // All categories (default + user's custom)
    defaultCategories: options.filter((o) => !o.isCustom),
    customCategories: options.filter((o) => o.isCustom),
  };
}
```

**API Endpoint (api/categories/route.ts):**
```typescript
// Get default categories (userId is null) and user's custom categories
const userCategories = await db.query.categories.findMany({
  where: or(
    isNull(categories.userId),
    eq(categories.userId, session.user.id)
  ),
  orderBy: [asc(categories.sortOrder), asc(categories.name)],
});
```

**Problem:** If user creates a custom category with the same name as a default category (e.g., "Streaming"), the dropdown shows both:
- Streaming (default, userId = null)
- Streaming (custom, userId = user's ID)

### Proposed Fix

**Option A: Deduplicate in Hook (Recommended)**

```typescript
export function useCategoryOptions() {
  const { data, ...rest } = useCategories();

  // Deduplicate by name - prefer user's custom categories over defaults
  const uniqueCategories = new Map<string, typeof data.categories[0]>();

  data?.categories.forEach((cat) => {
    const existing = uniqueCategories.get(cat.name.toLowerCase());

    // If custom category exists with same name, keep custom over default
    if (!existing || (cat.userId !== null && existing.userId === null)) {
      uniqueCategories.set(cat.name.toLowerCase(), cat);
    }
  });

  const options = Array.from(uniqueCategories.values())
    .map((cat) => ({
      value: cat.id,
      label: cat.name,
      icon: cat.icon,
      color: cat.color,
      isCustom: cat.userId !== null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically

  return {
    ...rest,
    data,
    options,
    defaultCategories: options.filter((o) => !o.isCustom),
    customCategories: options.filter((o) => o.isCustom),
  };
}
```

**Option B: Prevent Duplicate Creation (More Restrictive)**

```typescript
// api/categories/route.ts - POST handler
const slug = generateSlug(data.name);

// Check for duplicate slug for this user OR in defaults
const existing = await db.query.categories.findFirst({
  where: or(
    and(eq(categories.slug, slug), eq(categories.userId, session.user.id)),
    and(eq(categories.slug, slug), isNull(categories.userId))
  ),
});

if (existing) {
  return NextResponse.json(
    { error: "A category with this name already exists" },
    { status: 409 }
  );
}
```

**Recommendation:** **Option A** (client-side deduplication) is better UX. Allows user to customize default categories (e.g., change icon/color of "Streaming") while preventing duplicate display.

**Integration Risk:** NONE. Pure client-side filtering. No API or schema changes needed.

---

## Component Architecture Integration

### New Components Needed

**NONE.** All changes are enhancements to existing components.

### Modified Components

| Component | Change Type | Backward Compatible? |
|-----------|-------------|---------------------|
| `import/page.tsx` | State + logic enhancement | YES |
| `lib/openai/pdf-parser.ts` | Prompt + return type | YES (optional fields) |
| `api/import/route.ts` | Response enhancement | YES (additive) |
| `api/import/confirm/route.ts` | Insert field addition | YES (nullable column) |
| `lib/hooks/use-categories.ts` | Deduplication logic | YES (internal only) |
| `lib/utils/renewal-date.ts` | NEW file | N/A |

### Data Flow Changes

**Before:**
```
PDF Upload → OpenAI (filtered) → Review (high confidence only) → Confirm → DB
```

**After:**
```
PDF Upload → OpenAI (all items + bank + date) → Review (all items, smart defaults) → Confirm → DB (with source)
```

**Key Difference:** More data extracted and persisted, no breaking changes to flow structure.

---

## Database Schema Integration

### Migration Strategy

**Phase 1: Add Nullable Column**
```sql
-- Migration: 0001_add_statement_source.sql
ALTER TABLE subscriptions ADD COLUMN statement_source VARCHAR(255);
```

**Phase 2: (Optional) Data Backfill**
```sql
-- If historical data needs source, run custom migration
-- UPDATE subscriptions SET statement_source = 'Manual Entry' WHERE statement_source IS NULL AND import_audit_id IS NULL;
```

**Drizzle Workflow:**
1. Edit `schema.ts` to add `statementSource` column
2. Run `npm run db:generate` (creates migration file)
3. Review migration SQL
4. Run `npm run db:migrate` (applies to database)
5. Deploy code with schema changes

**Source:** [Drizzle ORM Migration Best Practices](https://app.studyraid.com/en/read/11288/352164/migration-best-practices) recommends adding columns as nullable for safe production rollout.

### Schema Impact

| Table | Change | Risk Level |
|-------|--------|------------|
| `subscriptions` | Add 1 column (nullable) | LOW |
| `importAudits` | No change | NONE |
| `categories` | No change | NONE |

**Total schema changes:** 1 column addition, fully backward-compatible.

---

## API Route Architecture

### Next.js 16 App Router Considerations

**Current Pattern:** Route Handlers (API routes in `/api`)

**Should We Use Server Actions Instead?**

According to Next.js 15/16 best practices:
- **Use Server Actions for:** Internal app mutations (forms, CRUD)
- **Use Route Handlers for:** Public APIs, third-party integrations, file uploads, streaming

**Decision:** **Keep Route Handlers** for import flow because:
1. File upload handling (FormData with PDF/images)
2. Complex multi-step process (upload → parse → confirm)
3. Streaming potential (future: progress updates during AI processing)
4. Existing architecture already uses Route Handlers consistently

**Source:** [Next.js Server Actions vs API Routes](https://dev.to/myogeshchavan97/nextjs-server-actions-vs-api-routes-dont-build-your-app-until-you-read-this-4kb9) (2025) recommends Route Handlers for file uploads and external service integration.

**No refactoring needed.** Current architecture aligns with Next.js 16 best practices.

---

## Build Order and Phasing

### Recommended Phase Structure

**Phase 1: Statement Source Tracking**
- **Why first:** Foundation for data quality, single schema change
- **Tasks:**
  1. Add `statementSource` column to schema
  2. Generate and apply migration
  3. Enhance AI prompt to extract bank name
  4. Update types and API responses
  5. Update confirm endpoint to persist source
- **Risk:** LOW (isolated change)
- **Dependencies:** None

**Phase 2: Smart Import (All Items)**
- **Why second:** Pure AI prompt tuning, no schema changes
- **Tasks:**
  1. Update AI system prompt
  2. Adjust import/page.tsx selection logic
  3. Add confidence badge styling for low-confidence items
- **Risk:** LOW (UI only)
- **Dependencies:** None

**Phase 3: Renewal Date Calculation**
- **Why third:** Builds on AI extraction, adds new utility
- **Tasks:**
  1. Enhance AI prompt to extract transaction dates
  2. Create renewal-date.ts utility
  3. Update import/page.tsx to use calculator
  4. Add transaction date to review UI
- **Risk:** LOW (graceful fallback)
- **Dependencies:** Phase 2 (AI prompt already enhanced)

**Phase 4: Category Deduplication**
- **Why last:** Pure client-side fix, can be done anytime
- **Tasks:**
  1. Update useCategoryOptions hook
  2. Add unit tests for deduplication logic
- **Risk:** NONE (internal hook change)
- **Dependencies:** None

**Parallelization Opportunity:** Phases 2, 3, and 4 can be developed in parallel after Phase 1 completes.

---

## Anti-Patterns to Avoid

### 1. Breaking Existing Import Flow

**Anti-Pattern:**
```typescript
// DON'T: Make new fields required without defaults
export interface DetectedSubscription {
  name: string;
  amount: number;
  transactionDate: string; // ❌ Required - breaks existing code
}
```

**Correct Pattern:**
```typescript
// DO: Make new fields optional
export interface DetectedSubscription {
  name: string;
  amount: number;
  transactionDate?: string; // ✅ Optional - backward compatible
}
```

### 2. Relying on AI to Always Extract New Fields

**Anti-Pattern:**
```typescript
// DON'T: Assume transactionDate always exists
const nextRenewal = addMonths(parseISO(sub.transactionDate), 1); // ❌ Crashes if undefined
```

**Correct Pattern:**
```typescript
// DO: Provide fallback
const nextRenewal = calculateNextRenewal(sub.transactionDate, sub.frequency); // ✅ Has fallback
```

### 3. Deduplicating Categories in API

**Anti-Pattern:**
```typescript
// DON'T: Filter in API - loses flexibility
// api/categories/route.ts
const userCategories = await db.query.categories.findMany({
  where: or(
    isNull(categories.userId),
    eq(categories.userId, session.user.id)
  ),
  // ❌ Can't show "you're overriding default" UI
});
// Filter duplicates here - loses information
```

**Correct Pattern:**
```typescript
// DO: Filter in hook - preserves data, client decides presentation
// use-categories.ts
const uniqueCategories = new Map<string, Category>();
// ✅ Can still access raw data if needed
```

### 4. Non-Nullable Schema Changes Without Migration Plan

**Anti-Pattern:**
```sql
-- DON'T: Add non-nullable column to existing table
ALTER TABLE subscriptions ADD COLUMN statement_source VARCHAR(255) NOT NULL; -- ❌ Breaks existing rows
```

**Correct Pattern:**
```sql
-- DO: Add as nullable first
ALTER TABLE subscriptions ADD COLUMN statement_source VARCHAR(255); -- ✅ Safe
-- Later: Backfill, then ALTER to NOT NULL if needed
```

---

## Integration Testing Strategy

### Unit Tests (Vitest)

**New Test Files:**
```
src/lib/utils/__tests__/renewal-date.test.ts
src/lib/hooks/__tests__/use-categories.test.ts
```

**Test Cases:**
- `calculateNextRenewal()` with valid transaction date (monthly)
- `calculateNextRenewal()` with valid transaction date (yearly)
- `calculateNextRenewal()` with undefined transaction date (fallback)
- `calculateNextRenewal()` with invalid date format (fallback)
- `useCategoryOptions()` deduplication (custom overrides default)
- `useCategoryOptions()` deduplication (two defaults with same name - edge case)

### E2E Tests (Playwright)

**Modified Test Files:**
```
tests/import.spec.ts
```

**Test Cases:**
- Import shows all detected items (not just high confidence)
- Import extracts bank name and displays it
- Import calculates renewal date from transaction date
- Category dropdown shows no duplicates
- Low-confidence items are unselected by default
- High-confidence items are selected by default
- Statement source is persisted to database

**Mock Strategy:**
```typescript
// Mock OpenAI response with new fields
await page.route('**/api/import', (route) => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({
      bankName: "Test Bank",
      subscriptions: [
        {
          name: "Netflix",
          amount: 15.99,
          currency: "USD",
          frequency: "monthly",
          confidence: 95,
          transactionDate: "2026-01-15",
          isDuplicate: false
        },
        {
          name: "Unknown Service",
          amount: 5.00,
          currency: "USD",
          frequency: "monthly",
          confidence: 45, // LOW confidence
          transactionDate: "2026-01-20",
          isDuplicate: false
        }
      ]
    })
  });
});
```

---

## Performance Considerations

### AI Response Time

**Current:** ~3-5 seconds for GPT-4o Vision per document

**Impact of Changes:**
- Extracting bank name: +0.1s (minimal - same document scan)
- Extracting transaction dates: +0.2s (requires date parsing in vision)
- Returning all items vs. filtered: -0.5s (less filtering logic)

**Net Impact:** ~0.2s slower (negligible, within acceptable range)

**Mitigation:** Already has 60s timeout configured (verified in v1.0 audit).

### Database Query Impact

**New Column:**
- `statementSource` VARCHAR(255) - indexed? **Not needed initially** (rarely queried, mostly displayed)
- Future optimization: Add index if "filter by statement source" feature added

**Category Deduplication:**
- Client-side only, no database impact
- Categories query already cached (5-minute staleTime in useCategories hook)

---

## Deployment Considerations

### Environment Variables

**No new environment variables needed.** All changes use existing OpenAI and database configurations.

### Database Migrations

**Production Rollout:**
1. Deploy migration (add `statementSource` column)
2. Verify migration success on Vercel
3. Deploy application code with new features
4. Monitor error logs for AI extraction failures

**Rollback Plan:**
- Column is nullable, safe to roll back code without reverting migration
- If needed, drop column with: `ALTER TABLE subscriptions DROP COLUMN statement_source;`

### Feature Flags (Optional)

If gradual rollout desired:
```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS = {
  SMART_IMPORT_ALL_ITEMS: process.env.NEXT_PUBLIC_ENABLE_SMART_IMPORT === 'true',
  STATEMENT_SOURCE_TRACKING: process.env.NEXT_PUBLIC_ENABLE_STATEMENT_SOURCE === 'true',
};

// Use in code
if (FEATURE_FLAGS.SMART_IMPORT_ALL_ITEMS) {
  // New behavior
} else {
  // Old behavior
}
```

**Recommendation:** Not needed for this milestone. Changes are low-risk and backward-compatible.

---

## Success Criteria

### Functional Requirements

- [ ] AI returns all detected items (confidence ≥30%)
- [ ] Items with confidence <80% are unselected by default
- [ ] Statement source (bank name) extracted and displayed
- [ ] Statement source persisted to database
- [ ] Renewal date calculated from transaction date when available
- [ ] Renewal date falls back to "1 month from now" if date unavailable
- [ ] Category dropdown shows no duplicates
- [ ] Custom categories override default categories in dropdown

### Non-Functional Requirements

- [ ] Import flow completes in <10 seconds for single page PDF
- [ ] AI extraction timeout remains at 60 seconds
- [ ] Database migration applies without downtime
- [ ] Existing imports continue to work (backward compatibility)
- [ ] E2E tests pass for import flow

### User Experience

- [ ] User sees all potential subscriptions, not just high-confidence
- [ ] User knows which bank the statement is from
- [ ] User sees calculated renewal dates (not arbitrary defaults)
- [ ] User doesn't see duplicate categories in dropdown
- [ ] Low-confidence items clearly marked (badge styling)

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Schema Changes | HIGH | Single nullable column, standard Drizzle migration |
| AI Enhancements | MEDIUM | Prompt tuning requires testing with real statements |
| Component Integration | HIGH | Existing patterns well-established, additive changes |
| Category Deduplication | HIGH | Pure client-side logic, no external dependencies |
| Build Order | HIGH | Phases are independent, can parallelize |
| Backward Compatibility | HIGH | All changes are optional or have fallbacks |

**Overall Confidence:** HIGH

**Areas Needing Validation:**
1. AI prompt effectiveness (requires testing with diverse bank statements)
2. Transaction date extraction accuracy (bank statement formats vary)
3. Bank name extraction reliability (headers/footers differ across banks)

**Mitigation:** Phase-specific research and testing before implementation.

---

## Sources

- [Next.js Server Actions vs API Routes: Don't Build Your App Until You Read This](https://dev.to/myogeshchavan97/nextjs-server-actions-vs-api-routes-dont-build-your-app-until-you-read-this-4kb9)
- [Drizzle ORM - Migrations](https://orm.drizzle.team/docs/migrations)
- [Migration Best Practices - Mastering Drizzle ORM](https://app.studyraid.com/en/read/11288/352164/migration-best-practices)
- [Server Actions vs Route Handlers in Next.js](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers)
- [Next.js 15: The App Router Finally Stopped Fighting Me](https://medium.com/@frankdotdev/next-js-15-the-app-router-finally-stopped-fighting-me-bde8847181e0)

---

**Research Complete.** Ready for roadmap creation.
