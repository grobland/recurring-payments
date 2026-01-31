# Domain Pitfalls: Import Enhancement & Category Management

**Domain:** Subscription Management System - Brownfield Enhancements
**Researched:** 2026-01-31
**Context:** Adding confidence-based import, statement tracking, renewal date fixes, and category CRUD to production system with existing users

## Executive Summary

This research identifies pitfalls specific to **enhancing an existing import system** rather than building from scratch. The critical difference: you have production data, existing user expectations, and working (but flawed) code. Breaking changes have real impact.

**Critical insight from research:** Most AI confidence pitfalls stem from **miscalibrated user expectations**, not technical implementation. When you change from "only showing high-confidence items" to "showing everything with scores," you're changing the product promise. Users who trusted "AI-filtered results" may now distrust "here's everything, you decide."

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or user churn.

---

### Pitfall 1: Confidence Threshold Changes Break User Trust

**What goes wrong:**

Current implementation filters items client-side (line 117 in import/page.tsx):
```typescript
selected: !sub.isDuplicate && sub.confidence >= 70
```

Changing to "show everything with scores" means users suddenly see **30 low-confidence false positives** instead of **7 curated suggestions**. Research shows: [miscalibrated AI confidence impairs appropriate reliance and reduces decision-making efficacy](https://arxiv.org/html/2402.07632v4). Users can't detect miscalibration, so they either:
- **Over-rely:** Accept all suggestions (including garbage)
- **Under-rely:** Reject everything (including good detections)

**Why it happens:**

Developers think "more transparency = better UX." But transparency without calibration creates cognitive overload. The current 70% threshold is arbitrary - GPT-4's confidence scores are **not well-calibrated** in practice. A "60% confident" item may be wrong 80% of the time.

**Consequences:**
- Users import incorrect subscriptions
- Support tickets: "AI is broken, it suggested Netflix when I don't have Netflix"
- Churn: "It was better before, now I have to review everything"

**Prevention:**

**DO NOT change filtering behavior without A/B testing.** Instead:

1. **Add confidence tiers** - Keep auto-selection at 70%, but show tiered results:
   - Green (85%+): Auto-selected, high confidence
   - Yellow (60-84%): Visible but unselected, medium confidence
   - Red (<60%): Hidden by default with "Show low confidence (X items)" toggle

2. **Communicate calibration** - [Research shows](https://arxiv.org/html/2402.07632v4) communicating calibration levels helps users detect miscalibration. Add messaging: "We're 85% confident" not just "85%"

3. **Test with real statements** - GPT-4 confidence varies by domain. Bank statements with clear formatting → higher calibration. Scanned receipts → lower calibration.

**Detection:**
- User imports then immediately deletes >30% of items
- Support tickets mentioning "wrong suggestions" or "too many false positives"
- Import abandonment rate increases after deploy

**Which phase:**
Phase 1 (Smart Import UI) - This is a **product decision** disguised as a technical change. Requires user research, not just implementation.

---

### Pitfall 2: Adding Statement Source FK Without Migration Strategy

**What goes wrong:**

You want to add `statementSourceId` to `subscriptions` table to track "which bank statement did this come from?" Naive approach:

```sql
ALTER TABLE subscriptions
ADD COLUMN statement_source_id UUID NULL
REFERENCES statement_sources(id);
```

Problem: **What about the 500 existing subscriptions?** They have `NULL` for `statement_source_id`. Your new UI assumes "every import-sourced subscription has a source" and crashes when querying:

```typescript
// This breaks on old data
subscription.statementSource.bankName // TypeError: Cannot read property 'bankName' of null
```

**Why it happens:**

[Adding foreign keys to existing data requires](https://docs.gitlab.com/ee/development/database/add_foreign_key_to_existing_column.html) **multi-step migration** and **data backfill strategy**. Developers skip backfill because "nullable is fine" - but nullable means **your code must handle both states forever**.

**Consequences:**
- Runtime errors on subscriptions page for existing users
- Analytics queries fail: `COUNT(DISTINCT statement_source_id)` gives wrong results (excludes NULL)
- Can't add `NOT NULL` constraint later without major migration

**Prevention:**

**Multi-step migration process:**

```sql
-- Migration 1: Add column (nullable)
ALTER TABLE subscriptions
ADD COLUMN statement_source_id UUID NULL;

-- Migration 2: Backfill existing import-sourced data
-- Strategy: Create synthetic "Unknown Statement" sources for historical imports
INSERT INTO statement_sources (id, user_id, file_name, import_audit_id)
SELECT
  gen_random_uuid(),
  ia.user_id,
  'Historical Import (Unknown Statement)',
  ia.id
FROM import_audits ia
WHERE ia.completed_at IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE subscriptions s
SET statement_source_id = (
  SELECT ss.id FROM statement_sources ss
  WHERE ss.import_audit_id = s.import_audit_id
)
WHERE s.import_audit_id IS NOT NULL
  AND s.statement_source_id IS NULL;

-- Migration 3 (next release): Add FK constraint NOT VALID
ALTER TABLE subscriptions
ADD CONSTRAINT fk_subscriptions_statement_source
FOREIGN KEY (statement_source_id)
REFERENCES statement_sources(id)
NOT VALID;

-- Migration 4 (next release): Validate constraint
ALTER TABLE subscriptions
VALIDATE CONSTRAINT fk_subscriptions_statement_source;
```

**CRITICAL:** [Add index BEFORE adding FK](https://docs.gitlab.com/ee/development/database/add_foreign_key_to_existing_column.html) to avoid table locks:

```sql
CREATE INDEX CONCURRENTLY idx_subscriptions_statement_source_id
ON subscriptions(statement_source_id);
```

**Code must handle NULL during transition:**

```typescript
// Safe approach
const sourceName = subscription.statementSource?.bankName ?? "Manual Entry";

// Better: Type-level safety
type Subscription = {
  statementSource: StatementSource | null; // Explicit nullable
}
```

**Detection:**
- Errors in production logs: "Cannot read property of null"
- Database query performance degradation (missing index)
- Migration rollback fails (FK constraint blocks it)

**Which phase:**
Phase 2 (Statement Sources) - Requires **3-4 deployment cycles** for safe rollout. Cannot be done in one phase.

---

### Pitfall 3: Renewal Date Calculation Assumes Transaction Date = Renewal Date

**What goes wrong:**

Statement shows:
```
Jan 15: Netflix $15.99
```

Naive calculation: "Next renewal is Feb 15" (transaction date + 1 month).

**Wrong.** Netflix likely bills on Jan 10, but transaction cleared on Jan 15. Real next renewal: Feb 10.

Now user gets reminder on Feb 13 saying "Netflix renews in 2 days" but it already renewed on Feb 10. Email is **late by 3 days.**

**Why it happens:**

Bank statements show **settlement dates** not **billing dates**. [The transaction date is when executed, value date is when effective](https://www.santander.com/en/stories/anatomy-of-a-bank-statement-whats-in-it). For recurring charges:
- **Billing date:** When merchant initiates charge (e.g., Jan 10)
- **Transaction date:** When bank processes it (e.g., Jan 15)

Gap can be 1-7 days depending on bank, merchant, weekends.

**Consequences:**
- Reminders sent AFTER renewal happens (defeats the purpose)
- User loses trust: "The app said it would remind me before renewal"
- Calendar integration is wrong: synced events are off by days

**Prevention:**

**Strategy 1: Ask user for historical pattern**

```typescript
// During import review, detect transaction month
const detectedMonth = transactionDate.getMonth(); // e.g., January
const detectedDay = transactionDate.getDate();    // e.g., 15

// Show UI: "We detected this transaction on Jan 15.
// Is this when Netflix usually bills you?"
// [Yes] [No, it's usually earlier: ___ days before]
```

**Strategy 2: Learn from multiple occurrences**

If user imports multiple statements:
```
Statement 1: Jan 15 - Netflix $15.99
Statement 2: Feb 13 - Netflix $15.99
Statement 3: Mar 14 - Netflix $15.99
```

Pattern: Transactions appear around 10-15th. Real billing: likely ~10th.

**Strategy 3: Conservative default + user confirmation**

```typescript
// Use transaction date but add warning
nextRenewalDate = addMonths(transactionDate, 1);

// UI shows:
"⚠️ Reminder: This date is based on when the charge appeared on your
statement, not when the service bills you. You may want to adjust it."

// Add quick-edit in review step
```

**Detection:**
- Users edit renewal dates immediately after import (sign the default is wrong)
- Reminder delivery logs show emails sent after `nextRenewalDate` already passed
- Support tickets: "reminder came too late"

**Which phase:**
Phase 3 (Renewal Date Intelligence) - Requires **transaction history analysis** if multiple statements available, otherwise **user confirmation step**.

---

### Pitfall 4: Category Dropdown Duplicates from Query Logic Bug

**What goes wrong:**

User mentioned "category dropdown duplicates." Looking at category query (line 25-30 in api/categories/route.ts):

```typescript
const userCategories = await db.query.categories.findMany({
  where: or(
    isNull(categories.userId),
    eq(categories.userId, session.user.id)
  ),
  orderBy: [asc(categories.sortOrder), asc(categories.name)],
});
```

**This query is correct.** The bug is likely in how **custom categories with same name as default categories** are displayed.

Scenario:
- Default category: "Streaming" (userId = NULL, slug = "streaming")
- User creates custom: "Streaming" (userId = "user-123", slug = "streaming")

Both appear in dropdown because uniqueness constraint is:
```sql
uniqueIndex("categories_user_slug_idx").on(table.userId, table.slug)
```

This allows `(NULL, "streaming")` and `("user-123", "streaming")` to coexist. Dropdown shows:
```
Streaming  (default)
Streaming  (custom)
```

Users think it's a bug because "why are there two Streaming options?"

**Why it happens:**

The validation in `POST /api/categories` (line 73-82) is **wrong:**

```typescript
const existing = await db.query.categories.findFirst({
  where: eq(categories.slug, slug),
});

if (existing && (existing.userId === session.user.id || existing.userId === null)) {
  return NextResponse.json(
    { error: "A category with this name already exists" },
    { status: 409 }
  );
}
```

This SHOULD prevent creating "Streaming" if default "Streaming" exists. But `findFirst` without proper filtering may not catch it.

**Consequences:**
- Duplicate category names in UI
- User confusion: "Which one should I pick?"
- Data integrity: User can create categories that duplicate defaults (wastes IDs, confuses analytics)

**Prevention:**

**Fix the validation to check BOTH conditions:**

```typescript
// Check for duplicate slug considering userId
const existing = await db.query.categories.findFirst({
  where: and(
    eq(categories.slug, slug),
    or(
      isNull(categories.userId),              // Conflicts with default
      eq(categories.userId, session.user.id)  // Conflicts with own custom
    )
  ),
});

if (existing) {
  const categoryType = existing.userId === null ? "default" : "your existing";
  return NextResponse.json(
    { error: `A category named "${data.name}" already exists in ${categoryType} categories` },
    { status: 409 }
  );
}
```

**Better: Prevent UI from even allowing it**

In category creation form:
```typescript
const { defaultCategories } = useCategoryOptions();
const reservedSlugs = defaultCategories.map(c =>
  c.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
);

// Validation
if (reservedSlugs.includes(generateSlug(nameInput))) {
  setError("This category name conflicts with a default category. Please choose a different name.");
}
```

**Detection:**
- Users report "I see duplicate categories"
- Category count grows unexpectedly (sign of duplicates being created)
- SELECT queries return duplicate display names

**Which phase:**
Phase 4 (Category Management) - This is a **data integrity bug** that must be fixed BEFORE allowing CRUD operations.

---

### Pitfall 5: Schema Changes Break TanStack Query Cache

**What goes wrong:**

You add `statementSource` relation to subscriptions. Server now returns:

```json
{
  "id": "...",
  "name": "Netflix",
  "statementSource": { "bankName": "Chase", "fileName": "statement.pdf" }
}
```

But TanStack Query has **cached old subscriptions** without `statementSource`. Component tries to render:

```typescript
{subscription.statementSource.bankName} // TypeError: Cannot read property 'bankName' of undefined
```

User sees blank page or error. Hard refresh fixes it (clears cache), but that's bad UX.

**Why it happens:**

[Backward compatibility requires](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html) **code that handles both old and new schema shapes** during rollout. TanStack Query cache has 5-minute `staleTime`, so old data persists after deploy.

**Consequences:**
- Production errors for users who don't hard-refresh
- Intermittent bugs: "Works on my machine" (clean cache) but not production (old cache)
- Emergency rollback needed

**Prevention:**

**Strategy 1: Bump cache version on breaking changes**

```typescript
// Before
export const subscriptionKeys = {
  all: ["subscriptions"] as const,
  // ...
};

// After (v2 schema with statementSource)
export const subscriptionKeys = {
  all: ["subscriptions", "v2"] as const, // <-- Version bump
  // ...
};
```

This invalidates all old cache entries automatically.

**Strategy 2: Type-safe nullable fields during transition**

```typescript
// Server response type (transitional)
type SubscriptionResponse = {
  id: string;
  name: string;
  statementSource?: StatementSource | null; // Optional during rollout
};

// Component code
const sourceName = subscription.statementSource?.bankName ?? "Unknown";
```

**Strategy 3: Prefetch new schema on deploy**

```typescript
// In providers.tsx or root layout
useEffect(() => {
  // Force refetch after deploy
  queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
}, []);
```

**Strategy 4: [Deploy readers first](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)**

1. Deploy **code that handles both schemas** (with `?` optional)
2. Wait for rollout (all users have new code)
3. Deploy **schema change** (API returns new field)
4. Remove nullable handling in next release

**Detection:**
- Sentry/error tracking shows `TypeError: Cannot read property` spikes after deploy
- Errors disappear after user hard-refresh
- Only affects users who were online during deploy

**Which phase:**
ALL phases that change API response shape - This is a **deployment discipline** issue, not a single phase problem.

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

---

### Pitfall 6: Import Audit Tracking Doesn't Link to Statement Sources

**What goes wrong:**

Current schema has:
- `subscriptions.importAuditId` → links to import session
- Future: `statement_sources` table to track files

But no link between them. A user imports 3 statements in one session:

```
Import Audit #42
  - Chase_Jan.pdf → Statement Source #101
  - Chase_Feb.pdf → Statement Source #102
  - BOA_Jan.pdf   → Statement Source #103
```

If `importAuditId` doesn't link to statement sources, you can't answer:
- "Which statements did I import in this session?"
- "Show me all subscriptions from Chase statements"

**Why it happens:**

The existing `importAudits` table (line 314-340 in schema.ts) tracks **aggregate stats** but not **which files**:

```typescript
fileCount: integer("file_count").notNull(),
totalPageCount: integer("total_page_count"),
// ❌ No array of actual files uploaded
```

**Prevention:**

Add bidirectional relationship:

```typescript
// statement_sources table
export const statementSources = pgTable("statement_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  importAuditId: uuid("import_audit_id").references(() => importAudits.id), // <-- Link back

  fileName: varchar("file_name", { length: 255 }).notNull(),
  bankName: varchar("bank_name", { length: 255 }),
  statementDate: timestamp("statement_date", { withTimezone: true }),

  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
});
```

Now you can query:
```typescript
// Get all sources from an import session
const sources = await db.query.statementSources.findMany({
  where: eq(statementSources.importAuditId, auditId)
});

// Get all subscriptions from a specific statement
const subs = await db.query.subscriptions.findMany({
  where: eq(subscriptions.statementSourceId, sourceId)
});
```

**Which phase:**
Phase 2 (Statement Sources) - Design the schema relationships **before** implementing features.

---

### Pitfall 7: Confidence Scores Not Persisted for Analytics

**What goes wrong:**

AI returns confidence scores during import review. User confirms import. Confidence scores are **thrown away** - they're never stored in database.

6 months later, product asks: "What's our average confidence score? How many low-confidence items do users accept?"

**You can't answer.** The data is gone.

**Why it happens:**

Developers treat confidence as "UI-only" metadata. But it's valuable for:
- **Product analytics:** Are users accepting low-confidence items? (Sign prompt needs tuning)
- **Model evaluation:** Compare confidence vs user acceptance rate
- **Support:** "Show me all low-confidence imports user accepted" (helps debug bad suggestions)

**Prevention:**

Add to `subscriptions` table:

```typescript
export const subscriptions = pgTable("subscriptions", {
  // ... existing fields

  // Import metadata
  importAuditId: uuid("import_audit_id").references(() => importAudits.id),
  importConfidence: integer("import_confidence"), // 0-100, NULL for manual entries
  importAcceptedAt: timestamp("import_accepted_at", { withTimezone: true }),

  // ... rest
});
```

Or create separate tracking table:

```typescript
export const importDecisions = pgTable("import_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  importAuditId: uuid("import_audit_id").notNull(),

  // What AI suggested
  detectedName: varchar("detected_name", { length: 255 }).notNull(),
  detectedAmount: decimal("detected_amount", { precision: 10, scale: 2 }),
  confidence: integer("confidence").notNull(),

  // What user did
  action: pgEnum(["accepted", "rejected", "modified"])("action").notNull(),
  finalSubscriptionId: uuid("final_subscription_id").references(() => subscriptions.id),

  createdAt: timestamp("created_at").defaultNow(),
});
```

Now you can analyze:
```sql
-- Acceptance rate by confidence tier
SELECT
  CASE
    WHEN confidence >= 85 THEN 'High'
    WHEN confidence >= 60 THEN 'Medium'
    ELSE 'Low'
  END as tier,
  COUNT(*) as suggestions,
  SUM(CASE WHEN action = 'accepted' THEN 1 ELSE 0 END) as accepted,
  ROUND(100.0 * SUM(CASE WHEN action = 'accepted' THEN 1 ELSE 0 END) / COUNT(*), 2) as acceptance_rate
FROM import_decisions
GROUP BY tier;
```

**Which phase:**
Phase 1 (Smart Import UI) - Add when implementing confidence display. **Easy to add now, impossible to backfill later.**

---

### Pitfall 8: Statement Source UI Without Deduplication

**What goes wrong:**

User uploads `Chase_Jan.pdf` on Feb 1. System creates `Statement Source #1`.

User forgets, uploads same file again on Feb 5. System creates `Statement Source #2` with identical subscriptions.

Now subscriptions list shows:
```
Netflix - $15.99 (from Chase_Jan.pdf)
Netflix - $15.99 (from Chase_Jan.pdf) ← Duplicate
```

**Why it happens:**

File upload doesn't check for duplicates. Current duplicate detection (line 229-262 in pdf-parser.ts) only checks **name + amount similarity**, not file hash.

**Prevention:**

**Strategy 1: File hash deduplication**

```typescript
import crypto from 'crypto';

async function getFileHash(buffer: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// In POST /api/import
const fileHash = getFileHash(pdfBuffer);

// Check if this file was imported before
const existing = await db.query.statementSources.findFirst({
  where: and(
    eq(statementSources.userId, session.user.id),
    eq(statementSources.fileHash, fileHash)
  )
});

if (existing) {
  return NextResponse.json({
    error: "This statement was already imported",
    existingImport: {
      importedAt: existing.uploadedAt,
      subscriptionsCount: existing.subscriptionsDetected
    }
  }, { status: 409 });
}
```

**Strategy 2: Date-based deduplication**

If statement has date metadata (e.g., "Statement Period: Jan 1-31"):

```typescript
// Check for overlapping periods
const overlapping = await db.query.statementSources.findFirst({
  where: and(
    eq(statementSources.userId, session.user.id),
    eq(statementSources.bankName, detectedBank),
    // Date ranges overlap
    sql`${statementSources.periodStart} <= ${periodEnd}
        AND ${statementSources.periodEnd} >= ${periodStart}`
  )
});
```

**Which phase:**
Phase 2 (Statement Sources) - Must be implemented **before launch** to prevent duplicate data pollution.

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

---

### Pitfall 9: Missing Undo for Category Changes

**What goes wrong:**

User assigns "Entertainment" category to 50 subscriptions. Realizes it should be "Streaming" instead. No bulk edit, no undo.

Must manually change 50 subscriptions one-by-one.

**Prevention:**

Add to category edit flow:

```typescript
// When user deletes/changes category
const affectedCount = await db.query.subscriptions.count({
  where: eq(subscriptions.categoryId, categoryId)
});

if (affectedCount > 0) {
  // Show confirmation modal
  "This category is used by {affectedCount} subscriptions.
   When deleted, they will be set to 'Uncategorized'."

  [Cancel] [Delete Category]
}
```

Add bulk edit:
```typescript
// In subscriptions list, allow multi-select
<Checkbox onChange={(ids) => setBulkSelected(ids)} />

{bulkSelected.length > 0 && (
  <Button onClick={() => showBulkEditModal()}>
    Edit {bulkSelected.length} subscriptions
  </Button>
)}
```

**Which phase:**
Phase 4 (Category Management) - Nice-to-have for v1, required for production use.

---

### Pitfall 10: No Visual Diff for Renewal Date Changes

**What goes wrong:**

Import suggests "Next renewal: Feb 15" based on transaction date. User knows it's wrong, changes to "Feb 10". Saves.

Weeks later: "Wait, when does Netflix renew again?" No record that they manually corrected the AI suggestion.

**Prevention:**

Add audit trail:

```typescript
export const subscriptions = pgTable("subscriptions", {
  // ...
  nextRenewalDate: timestamp("next_renewal_date").notNull(),

  // Track if user manually corrected it
  renewalDateSource: pgEnum(["ai_suggested", "user_set", "learned"])("renewal_date_source"),
  renewalDateModifiedAt: timestamp("renewal_date_modified_at"),
  renewalDateModifiedBy: varchar("renewal_date_modified_by"), // 'import_ai' | 'user_edit'
});
```

UI shows:
```
Next Renewal: Feb 10, 2026
ℹ️ You set this date (AI suggested Feb 15)
```

**Which phase:**
Phase 3 (Renewal Date Intelligence) - Helps debug "why is this date wrong?" support issues.

---

## Phase-Specific Warnings

| Phase | Critical Pitfall | Moderate Pitfall | Mitigation |
|-------|------------------|------------------|------------|
| **Phase 1: Smart Import UI** | Confidence threshold changes break trust (Pitfall #1) | Confidence scores not persisted (Pitfall #7) | A/B test UI changes, add tiered display, persist scores for analytics |
| **Phase 2: Statement Sources** | Adding FK without migration strategy (Pitfall #2) | Import audit doesn't link to sources (Pitfall #6) | Multi-step migration, backfill historical data, add bidirectional FK |
| **Phase 3: Renewal Date Fix** | Assuming transaction date = billing date (Pitfall #3) | No visual diff for manual corrections (Pitfall #10) | Add "adjust earlier by X days" UI, learn from patterns, track modification source |
| **Phase 4: Category CRUD** | Duplicate category names allowed (Pitfall #4) | No undo for bulk changes (Pitfall #9) | Fix validation to check default conflicts, add bulk edit with preview |
| **All Phases** | Schema changes break TanStack cache (Pitfall #5) | N/A | Version cache keys, deploy readers first, use optional types during transition |

---

## Cross-Cutting Concerns

### Data Migration Safety Checklist

For **any** schema change:

- [ ] Can existing data coexist with new schema? (nullable columns, optional fields)
- [ ] Do you need backfill strategy for existing records?
- [ ] Will this break cached API responses? (TanStack Query, service workers)
- [ ] Can this migration be rolled back safely?
- [ ] Is there an index for new FK columns? (added BEFORE constraint)
- [ ] Are you using NOT VALID → VALIDATE pattern for large tables?

[Source: GitLab foreign key guidelines](https://docs.gitlab.com/ee/development/database/add_foreign_key_to_existing_column.html)

### Brownfield Deployment Discipline

Since this is a **production system with users:**

1. **Never assume empty database** - All migrations must handle existing data
2. **Deploy schema changes in multiple releases** - NOT VALID → VALIDATE pattern
3. **Maintain backward compatibility** - Old code must work with new schema during rollout
4. **Version API responses** - Cache invalidation strategy for breaking changes
5. **Test with production data snapshots** - Staging environment with real data patterns

[Source: Brownfield migration challenges](https://hygraph.com/blog/brownfield-migration)

### AI Confidence Calibration Reality Check

**GPT-4 confidence scores are NOT probabilities.** A "70% confident" extraction doesn't mean "70% chance of being correct." It means "the model's internal representation assigns this certainty score."

[Research shows](https://arxiv.org/html/2402.07632v4):
- Miscalibration is common (80% confident → 60% accurate)
- Users can't detect miscalibration without training
- Showing raw scores without context reduces trust

**Best practice:** Calibrate thresholds using **real user feedback:**

```sql
-- After 100+ imports, analyze actual accuracy
SELECT
  confidence_bucket,
  COUNT(*) as total,
  SUM(CASE WHEN user_accepted THEN 1 ELSE 0 END) as accepted,
  ROUND(100.0 * SUM(CASE WHEN user_accepted THEN 1 ELSE 0 END) / COUNT(*), 2) as actual_accuracy
FROM (
  SELECT
    CASE
      WHEN confidence >= 85 THEN '85-100'
      WHEN confidence >= 70 THEN '70-84'
      WHEN confidence >= 50 THEN '50-69'
      ELSE '<50'
    END as confidence_bucket,
    action = 'accepted' as user_accepted
  FROM import_decisions
) grouped
GROUP BY confidence_bucket;
```

If "70-84" bucket has 45% acceptance, your threshold is wrong. Adjust thresholds based on **empirical data**, not guesses.

---

## Validation Checklist

Before marking research complete:

- [x] All pitfalls specific to brownfield enhancements (not generic warnings)
- [x] Integration pitfalls with existing schema covered (FK migrations, cache invalidation)
- [x] Prevention strategies are actionable (code samples, migration patterns)
- [x] Detection methods provided (error signatures, metrics to watch)
- [x] Phase assignments clear (which phase must address which pitfall)
- [x] Cross-cutting concerns identified (deployment discipline, data safety)
- [x] Research sources cited for critical claims

---

## Sources

### AI Confidence & User Trust
- [Understanding the Effects of Miscalibrated AI Confidence on User Trust](https://arxiv.org/html/2402.07632v4) - Research showing confidence calibration impacts decision-making
- [People + AI Guidebook: Explainability & Trust](https://pair.withgoogle.com/chapter/explainability-trust) - Google PAIR guidelines for AI transparency
- [Designing a Confidence-Based Feedback UI](https://medium.com/design-bootcamp/designing-a-confidence-based-feedback-ui-f5eba0420c8c) - UX patterns for displaying confidence scores

### Database Migration Best Practices
- [GitLab: Add Foreign Key to Existing Column](https://docs.gitlab.com/ee/development/database/add_foreign_key_to_existing_column.html) - Multi-step migration pattern for production databases
- [Backward Compatible Database Changes - PlanetScale](https://planetscale.com/blog/backward-compatible-databases-changes) - Deployment strategies for schema evolution
- [PostgreSQL: Foreign Key with Null Values](https://www.geeksforgeeks.org/postgresql/foreign-key-with-a-null-value-in-postgresql/) - Handling nullable foreign keys

### Schema Evolution & Compatibility
- [Schema Evolution and Compatibility - Confluent](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html) - Backward compatibility patterns for data schemas
- [AWS DevOps: Ensure Backwards Compatibility for Schema Changes](https://docs.aws.amazon.com/wellarchitected/latest/devops-guidance/dl.ads.5-ensure-backwards-compatibility-for-data-store-and-schema-changes.html) - Best practices for production schema changes

### Brownfield Migration Challenges
- [Brownfield CMS Migrations: Challenges and Opportunities](https://hygraph.com/blog/brownfield-migration) - Pitfalls when enhancing existing systems
- [SAP Brownfield Migration Challenges](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-members/brownfield-sap-s4hana-implementation/ba-p/13977836) - Data migration complexity in legacy systems

### Financial Data & Transaction Dates
- [Anatomy of a Bank Statement](https://www.santander.com/en/stories/anatomy-of-a-bank-statement-whats-in-it) - Understanding transaction vs. value dates
- [What to Expect with a Payment's Effective Date](https://www.moderntreasury.com/journal/what-to-expect-with-a-payments-effective-date) - Difference between processing and settlement dates

### PostgreSQL Best Practices
- [Hidden Dangers of Duplicate Key Violations in PostgreSQL](https://aws.amazon.com/blogs/database/hidden-dangers-of-duplicate-key-violations-in-postgresql-and-how-to-avoid-them/) - Concurrency issues with unique constraints
- [PostgreSQL: Foreign Key Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) - Official documentation on FK behavior
