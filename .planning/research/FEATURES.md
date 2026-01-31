# Feature Landscape: Import Improvements

**Domain:** Subscription management with AI-powered PDF import
**Researched:** 2026-01-31
**Context:** Enhancing existing basic PDF import with confidence scoring, statement sources, and category management

## Table Stakes

Features users expect from smart import and category management. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Show all detected items** | Users expect to see everything AI found, not filtered subset | Low | Current system already has confidence scores, just needs UI to show all items |
| **Visual confidence indicators** | Standard in AI/ML features; users need to know system certainty | Low | Use color coding: green (high), yellow (medium), red (low) - per Mindee/Docsumo patterns |
| **Manual selection/deselection** | Users need control over what gets imported; core UX principle | Low | Checkbox per item with "Select All" / "Deselect All" toggles |
| **Prevent duplicate categories** | Database integrity issue; confusing UX when duplicates appear | Low | Unique constraint already exists (categories_user_slug_idx), UI needs validation |
| **Category CRUD operations** | Managing custom categories is expected in any categorization system | Medium | Create, update, delete with proper error handling |
| **Safe category deletion** | Prevent data loss when category has dependencies | Medium | Current schema uses ON DELETE SET NULL - need UI confirmation flow |
| **Import session tracking** | Users need to see what came from which import | Low | `import_audits` table exists but needs UI display |
| **Duplicate detection** | Prevent importing same subscription twice | Low | Already implemented via `detectDuplicates()` function |

## Differentiators

Features that set product apart from basic subscription trackers. Competitive advantages.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Confidence-based workflows** | Let users route high-confidence to auto-approve, low-confidence to review | Medium | Threshold configuration (e.g., >80% auto-approve) with manual review queue |
| **Statement source tracking** | Organize imports by bank/card; essential for multi-account users | Low | Add `source_name` field to `import_audits` table |
| **Source reuse/autocomplete** | Speed up repeat imports from same bank | Low | Autocomplete from previous source names per user |
| **Confidence score calibration** | Show AI reasoning for confidence level | High | Requires structured output from OpenAI with explanation field |
| **Batch operations on low-confidence items** | "Reject all below 50%" or "Review all medium confidence" | Low | Filter + bulk actions in confirmation UI |
| **Statement data preservation** | Store raw statement data for reference/audit | Medium | Add `raw_data` JSONB field to `import_audits` |
| **Transaction date tracking** | Calculate renewal dates from actual statement dates, not import date | Medium | AI needs to extract transaction dates; more accurate than current system |
| **Category suggestion based on merchant** | AI suggests category based on service name | Medium | Use merchant name patterns (Netflix → Entertainment) |
| **Import history timeline** | Visual timeline of imports with source, date, item counts | Low | Query `import_audits` with nice UI |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain or out of scope.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full bank integration** | Scope creep; requires Plaid/Yodlee; security/regulatory burden | Focus on PDF/image import; simpler, user-controlled |
| **Auto-categorization training** | Complex ML pipeline; maintenance burden; low ROI | Use rule-based merchant patterns; good enough for MVP |
| **OCR confidence per field** | Over-engineering; GPT-4 Vision gives item-level confidence | Single confidence score per subscription item is sufficient |
| **Version history for categories** | Unnecessary complexity for category renames | Simple update is fine; subscriptions keep reference via SET NULL |
| **Cascade delete for categories** | Data loss risk; users may not understand implications | Always SET NULL and make subscriptions "uncategorized" |
| **Import scheduling/automation** | No bank connection, so nothing to schedule | Manual import only; user uploads when they get statement |
| **Multi-user import review** | Enterprise feature; this is B2C product | Single user reviews their own imports |
| **Confidence score editing** | Users shouldn't override AI confidence; defeats the purpose | Users select/deselect items, but don't edit scores |

## Feature Dependencies

### Import Flow
```
Upload PDF/Image
  ↓
Extract + AI Analysis (existing)
  ↓
Confidence Scoring (existing, AI-provided)
  ↓
[NEW] Show ALL items with confidence indicators
  ↓
[NEW] User selects which to import
  ↓
[NEW] Calculate renewal dates from transaction dates
  ↓
Duplicate Detection (existing)
  ↓
Category Assignment (existing, enhanced with suggestions)
  ↓
Confirm Import
  ↓
[NEW] Store statement source + full data
```

### Category Management
```
Category List UI
  ↓
CRUD Operations (create, update, delete)
  ↓
Delete Validation:
  - Check for dependent subscriptions
  - Show warning with count
  - Confirm: subscriptions become uncategorized
  ↓
Update subscriptions.categoryId = NULL (ON DELETE SET NULL)
```

### Confidence Score Usage
```
AI Detection → Confidence Score (0-100)
  ↓
Visual Indicator in UI:
  - 80-100: Green (High) - "Looks good"
  - 50-79: Yellow (Medium) - "Please review"
  - 0-49: Red (Low) - "Uncertain, verify carefully"
  ↓
User Decision:
  - Select high-confidence items by default
  - User reviews and adjusts selections
  - User can select/deselect any item regardless of confidence
```

## MVP Recommendation

For v1.1 Import Improvements milestone, prioritize:

### Phase 1: Smart Import UX (Highest Priority)
1. **Show all detected items** - Remove filtering, display everything
2. **Visual confidence indicators** - Color-coded badges (green/yellow/red)
3. **Manual selection** - Checkbox per item with select-all toggle
4. **Default selection logic** - Auto-select items >70% confidence
5. **Sorting by confidence** - High confidence first for easier review

**Why first:** Directly addresses user complaint "AI misses subscriptions" - it's not missing them, just hiding low-confidence ones.

### Phase 2: Category Management (Data Quality)
1. **Fix duplicate categories** - Add client-side validation, show error on duplicate name
2. **Category CRUD UI** - Add create/edit/delete modals in settings
3. **Safe delete flow** - Show count of subscriptions, confirm they'll become uncategorized
4. **Category list UI improvements** - Better organization, search/filter

**Why second:** Blocking bug (duplicates in dropdown) + foundation for future features.

### Phase 3: Statement Sources (Organization)
1. **Source field in import flow** - "Bank/Card Name" text input
2. **Store in import_audits** - Add `source_name` column
3. **Source autocomplete** - Show previous sources for easy reuse
4. **Display source in history** - Show which bank each import came from

**Why third:** Organizational improvement, not blocking. Nice-to-have for multi-account users.

### Phase 4: Enhanced Accuracy (Data Quality)
1. **Transaction date extraction** - Update AI prompt to extract dates
2. **Renewal date calculation** - Use transaction date, not import date
3. **Statement data preservation** - Store raw detected data in `import_audits.raw_data` JSONB

**Why fourth:** Accuracy improvement but not critical path. Can be refined after core UX is solid.

## Defer to Post-v1.1

These features are valuable but not required for v1.1 milestone:

- **Confidence threshold configuration** - Let users set auto-select threshold
- **Category suggestions** - AI-powered category recommendations
- **Import history timeline** - Visual UI for import audit log
- **Batch confidence operations** - "Reject all below X%"
- **Confidence reasoning** - Why AI gave this score
- **Statement data viewer** - Show raw detected data from past imports

## Current System Analysis

### Already Implemented ✓
- Confidence scores from AI (0-100 scale)
- Duplicate detection algorithm
- Import audit tracking (`import_audits` table)
- Category assignment during import
- Proper database constraints (ON DELETE SET NULL for categories)

### Needs Implementation ⚠️
- **UI to show all items** - Currently hidden/filtered somewhere
- **Confidence visualization** - No visual indicators in UI
- **Category CRUD UI** - Only read operations visible to users
- **Statement source tracking** - No field in schema or UI
- **Transaction date extraction** - AI prompt doesn't request dates

### Known Issues 🐛
- Category dropdown shows duplicates (schema has unique constraint, validation issue)
- Low-confidence items not shown to user (filtering problem)
- Renewal dates calculated from import date, not transaction date (accuracy issue)

## UX Patterns from Research

### Confidence Score Visualization (Mindee, Docsumo standards)
- **High Confidence (>80):** Green indicator, green checkmark icon
  - Message: "High confidence - Looks accurate"
  - Default: Selected for import
- **Medium Confidence (50-79):** Yellow indicator, yellow eye icon
  - Message: "Medium confidence - Please review"
  - Default: Selected, but flagged for user review
- **Low Confidence (<50):** Red indicator, red warning icon
  - Message: "Low confidence - Verify carefully"
  - Default: Not selected, user must explicitly opt-in

### Category Delete with Dependencies (Standard CRUD pattern)
```
User clicks "Delete" on category with 5 subscriptions:

┌─────────────────────────────────────────┐
│  Delete "Entertainment" category?       │
├─────────────────────────────────────────┤
│  5 subscriptions use this category:     │
│  • Netflix                              │
│  • Spotify                              │
│  • Disney+                              │
│  • ... (2 more)                         │
│                                          │
│  These subscriptions will become        │
│  uncategorized. You can reassign        │
│  them later.                            │
│                                          │
│  [Cancel]  [Delete Category]            │
└─────────────────────────────────────────┘
```

### Statement Source Input (Finance app pattern)
```
During import flow, after upload:

┌─────────────────────────────────────────┐
│  Statement Source (optional)            │
│  ┌─────────────────────────────────┐   │
│  │ Chase Sapphire Card          ▼ │   │ ← Autocomplete dropdown
│  └─────────────────────────────────┘   │
│  Recent sources:                        │
│  • Chase Sapphire Card                  │
│  • Bank of America Checking             │
│  • Amex Gold                            │
└─────────────────────────────────────────┘
```

### Confidence-Based Selection (AI transaction matching pattern)
```
Import Results - 8 items detected

[✓] Select All High Confidence (5)    [ ] Select All Items (8)

┌────────────────────────────────────────────────┐
│ ✓ [🟢 95%] Netflix     $15.99  Monthly         │ ← Auto-selected
│ ✓ [🟢 92%] Spotify     $9.99   Monthly         │ ← Auto-selected
│ ✓ [🟡 68%] Adobe CC    $54.99  Monthly         │ ← Selected, flagged
│ ☐ [🟡 55%] AWS Cloud   $12.45  Monthly         │ ← Not selected
│ ☐ [🔴 42%] Unknown     $8.00   Monthly         │ ← Not selected
└────────────────────────────────────────────────┘

✓ = Selected for import
🟢 = High confidence
🟡 = Medium confidence
🔴 = Low confidence
```

## Complexity Estimates

| Feature Category | Effort | Risk | Dependencies |
|-----------------|--------|------|--------------|
| Smart Import UX | 2-3 days | Low | None - UI changes only |
| Category CRUD | 1-2 days | Low | Existing schema already correct |
| Statement Sources | 1 day | Low | Simple schema addition |
| Transaction Dates | 2-3 days | Medium | AI prompt changes, date parsing |
| Confidence Workflows | 3-5 days | Medium | Requires state management for thresholds |

## Sources

### AI Transaction Matching & Confidence Patterns
- [SolveXia: Transaction Matching Using AI](https://www.solvexia.com/blog/transaction-matching-using-ai)
- [HighRadius: AI-Powered Transaction Matching](https://www.highradius.com/product/transaction-matching-software/)
- [Midday: Building Automatic Reconciliation Engine](https://midday.ai/updates/automatic-reconciliation-engine/)

### Confidence Score UI Patterns
- [Docsumo: Confidence Score Documentation](https://support.docsumo.com/docs/confidence-score)
- [Mindee: Confidence Score & Accuracy Boost](https://docs.mindee.com/models/optional-features/automation-confidence-score)
- [Microsoft Learn: Confidence Score Concepts](https://learn.microsoft.com/en-us/azure/ai-services/qnamaker/concepts/confidence-score)

### Category Management & Dependencies
- [Microsoft Learn: Cascade Delete in EF Core](https://learn.microsoft.com/en-us/ef/core/saving/cascade-delete)
- [Supabase: Cascade Deletes Documentation](https://supabase.com/docs/guides/database/postgres/cascade-deletes)
- [Django Understanding: ON DELETE CASCADE vs PROTECT](https://www.linkedin.com/pulse/understanding-power-ondelete-cascade-vs-protect-django-framework)

### Subscription Management Apps (2026)
- [CNBC Select: Best Subscription Trackers of 2026](https://www.cnbc.com/select/best-subscription-trackers/)
- [Kudos: 7 Best Apps to Manage Subscriptions (2026)](https://www.joinkudos.com/blog/7-best-tools-and-tips-to-manage-your-subscriptions-and-avoid-subscription-creep)
- [Rob Berger: 7 Best Subscription Manager Apps (2026)](https://robberger.com/subscription-manager-apps/)

### Bank Statement & Finance Apps
- [Oreate AI: Best Apps for Tracking Spending Across Multiple Accounts](https://www.oreateai.com/blog/mastering-your-finances-the-best-apps-for-tracking-spending-across-multiple-accounts/36713075cf5f23b84bc8c69c485444c3)
- [DocuClipper: Transaction Categorization Software](https://www.docuclipper.com/features/transaction-categorization/)
- [Buxfer: Best Budget App & Expense Tracker for 2026](https://www.buxfer.com/)

**Confidence Assessment:**
- Table Stakes: **HIGH** - Clear user expectations from finance/AI app patterns
- Differentiators: **MEDIUM** - Based on competitor feature analysis, some inference
- Anti-Features: **HIGH** - Based on scope analysis and existing project constraints
- Complexity: **HIGH** - Direct codebase analysis of existing implementation
