# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Users can see all their subscriptions in one place and never get surprised by a renewal again
**Current focus:** v2.0 Statement Hub - Gap Closure

## Current Position

Phase: 21 (Manual Tagging & Conversion) - Gap Closure
Plan: 06 of 06 (Fix Stale Closure in Bulk Tag)
Status: Complete
Last activity: 2026-02-10 - Completed 21-06-PLAN.md (gap closure)

Progress: [=========================] 100% (23 of 23 phases + gap closures)

## Milestone Summary

### v1.3 Data & Intelligence (SHIPPED 2026-02-08)

**Phases:** 13-18 (6 phases, 21 plans)
**Requirements:** 23/23 complete
**Files modified:** 146
**LOC:** ~27,350 TypeScript

**Key accomplishments:**
- Analytics infrastructure with materialized views
- Duplicate detection with merge capabilities
- Spending trends and forecasting with fan charts
- Pattern recognition with subscription suggestions
- Anomaly alerts with notification bell and weekly digest

### v2.0 Statement Hub (COMPLETE)

**Phases:** 19-23 (5 phases)
**Requirements:** 27 total (27 complete)
**Milestone goal:** Transform import to comprehensive statement management with batch uploads, full data retention, and manual enrichment

**Phase 19 complete:**
- 19-01: Schema and hashing foundation (DONE)
- 19-02: Batch upload API endpoints (DONE)
- 19-03: Batch upload hook (DONE)
- 19-04: Batch upload UI components (DONE)
- 19-05: Batch import page and verification (DONE)

**Phase 20 complete:**
- 20-01: Transaction data layer (DONE)
- 20-02: Virtualized table, filters, and page (DONE)

**Phase 21 complete:**
- 21-01: Tags schema and CRUD foundation (DONE)
- 21-02: Inline tagging UI (DONE)
- 21-03: Transaction conversion (DONE)
- 21-04: Bulk operations (DONE)

**Phase 22 complete:**
- 22-01: Source coverage API (DONE)
- 22-02: Source dashboard component (DONE)
- 22-03: Statement detail & re-import (DONE)
- 22-04: Incomplete batch banner (DONE)

**Phase 23 complete:**
- 23-01: Bulk API & Suggestion Components (DONE)
- 23-02: Bulk Hooks & Actions Bar (DONE)
- 23-03: Suggestions Page & SuggestionCard (DONE)
- 23-04: Auto-tagging & Detection Trigger (DONE)

## Performance Metrics

**Velocity:**
- Total plans completed: 71
- Average duration: ~6.2 min
- Total execution time: ~442 min (~7.4 hours)

**By Milestone:**

| Milestone | Plans | Total | Avg/Plan |
|-----------|-------|-------|----------|
| v1.0 MVP | 7 | ~57 min | ~8 min |
| v1.1 Import Improvements | 11 | ~70 min | ~6 min |
| v1.2 Production Polish | 10 | ~70 min | ~7 min |
| v1.3 Data & Intelligence | 21 | ~149 min | ~7.1 min |
| v2.0 Statement Hub | 22 | ~96 min | ~4.4 min |

## Accumulated Context

### Patterns Established

| Pattern | Description |
|---------|-------------|
| Materialized view | CREATE MV with UNIQUE INDEX for CONCURRENTLY refresh |
| Cron endpoint | verify CRON_SECRET, log timing, return JSON |
| Hook invalidation | useInvalidate* for mutation side-effects |
| Period selector | Dropdown with getParams() for date calculations |
| Similarity scoring | 0-100 score + matches object for field breakdown |
| Duplicate threshold | 70% detection, 85%+ defaults to Skip |
| Merge tracking | mergedAt + mergedIntoId for soft delete with undo |
| Trend indicators | Red=up (bad), green=down (good) for spending |
| Pattern confidence | Multi-factor (occurrence 30%, interval 40%, amount 30%) |
| Forecast uncertainty | sqrt(time) scaling for confidence intervals |
| Fan chart stacking | Stack bands from lower95 base upward |
| Alert lifecycle | acknowledgedAt/dismissedAt for user interaction |
| Weekly digest | Batch alerts to prevent notification fatigue |
| Chunked file hashing | 1MB chunks for memory efficiency with large files |
| User-scoped unique | pdfHash uniqueness per user, not global |
| Transaction fingerprint | merchant+amount+date hash for dedup |
| Processing status lifecycle | pending -> processing -> complete/failed |
| Sequential file processing | One file at a time to prevent memory exhaustion |
| LocalStorage queue persistence | Queue state survives page refresh |
| Batch UI components | BatchUploader > FileQueue > FileItem hierarchy |
| queueRef pattern | Use ref for sync state access in async loops |
| Keyset pagination | (date, id) cursor for O(1) pagination at any depth |
| Debounce query key | Debounce state value, not queryFn |
| Virtualized scrolling | useVirtualizer with IntersectionObserver for 10k+ items |
| Responsive list layouts | useIsMobile to switch table/card views |
| Many-to-many junction | transactionTags with composite primary key |
| Inline tag toggle | TagCombobox with useTags() + useToggleTransactionTag() |
| Tag badges | Limited display with +N overflow indicator |
| Undo toast pattern | 8-second duration with inline action callback |
| Conversion with cleanup | Undo deletes created subscription |
| Checkbox selection | Set<string> state with toggleOne/toggleAll |
| Floating action bar | Fixed bottom-center z-50 for bulk actions |
| Bulk mutations | Validate ownership, onSuccess clears selection |
| SQL aggregation for stats | GROUP BY + CASE WHEN for status counts |
| Gap detection | eachMonthOfInterval for coverage gaps |
| Accordion-based list | Single-column expandable list for variable content |
| Lazy-load on expand | Fetch child data only when accordion opens |
| Wizard queue state | queue/currentIndex/completed/skipped for sequential processing |
| Bulk transaction locking | FOR UPDATE to prevent race conditions |
| Variance threshold | 10% deviation flags significant price changes |
| Query key factory | patternKeys with all/lists/suggestions for cache invalidation |
| Fire-and-forget API | fetch().catch() without await for non-blocking operations |
| Batch count accumulation | potentialCountRef to track metrics across multi-file batch |

### v2.0 Architecture Notes

From research (2026-02-08):
- Sequential PDF processing prevents memory exhaustion (50-100MB per file)
- Keyset (cursor-based) pagination required for 10k+ line items
- TanStack Virtual for virtualized scrolling (only new dependency needed)
- Table partitioning by user + date for time-based cleanup
- Statement line items stored separately from subscriptions
- Bidirectional links: subscription.sourceLineItemId -> lineItem.convertedToSubscriptionId

### Decisions

| Decision | Choice | Why | Plan |
|----------|--------|-----|------|
| Keyset over OFFSET | (transactionDate, id) cursor | O(1) performance at any depth | 20-01 |
| TanStack Virtual | @tanstack/react-virtual | Lightweight, React-native API | 20-02 |
| User-scoped tag names | uniqueIndex on (userId, name) | Different users can have same tag name | 21-01 |
| Batch tag fetch | inArray() query per page | Avoid N+1 queries for tags | 21-02 |
| Limited tag display | Max 2-3 visible with +N overflow | Prevent row overflow in virtualized list | 21-02 |
| 8-second undo toast | Long window for safe conversions | User needs time to click undo | 21-03 |
| Delete subscription on undo | Hard delete created subscription | Simplifies undo logic | 21-03 |
| Default monthly frequency | All conversions assume monthly | Most common, user can edit after | 21-03 |
| Header checkbox scope | Visible (loaded) rows only | Clear UX expectation | 21-04 |
| Clear selection on filter | Prevent stale selections | Avoids operating on wrong items | 21-04 |
| Reuse localStorage key | Parse existing batch-upload-queue | No duplicate storage | 22-04 |
| SQL aggregation | GROUP BY + CASE WHEN | Avoid N+1 for source stats | 22-01 |
| Gap detection via date-fns | eachMonthOfInterval | Reliable month range generation | 22-01 |
| URL-encode sourceType | decodeURIComponent in API | Handle spaces in source names | 22-01 |
| Accordion over card grid | Single-column accordion list | Better for variable content, cleaner UX | 22-02 |
| Lazy load statements | Fetch on expand | Avoid loading all upfront | 22-02 |
| Tooltip for gaps | Badge with hover tooltip | Compact, details on demand | 22-02 |
| Queue-based wizard | Process one transaction at a time | Wizard-style per CONTEXT.md | 22-03 |
| Skip marks not_subscription | Update tagStatus on skip | Consistent with tagging pattern | 22-03 |
| FOR UPDATE locking | .for("update") in transaction | Prevent race conditions on bulk ops | 23-01 |
| 10% variance threshold | Flag amounts >10% from average | Balance sensitivity vs false positives | 23-01 |
| Scatter chart timeline | Recharts ScatterChart | Visual temporal pattern display | 23-01 |
| Pattern keys factory | Export patternKeys from hook | Consistent cache invalidation | 23-02 |
| Fire-and-forget detection | Don't await pattern detection | Batch completion shouldn't wait for detection | 23-04 |
| potentialCount accumulation | Track across batch files via ref | Total count for toast notification | 23-04 |

### Blockers/Concerns

**Production deployment (carried forward):**
- RESEND_FROM_EMAIL needs verified domain for email delivery
- NEXT_PUBLIC_SENTRY_DSN needed for Sentry error tracking

**Database migrations (run if not already done):**
- 0002_create_analytics_mv.sql - analytics materialized view
- 0002_gorgeous_surge.sql - mergedAt/mergedIntoId columns
- 0003_old_azazel.sql - recurring_patterns table
- 0004_modern_argent.sql - alerts table and alert_type enum
- 0005_strange_triathlon.sql - statements and transactions tables
- 0006_typical_captain_stacy.sql - tags and transaction_tags tables

## Gap Closures

### Phase 21 Gap Closures

| Plan | Issue | Fix | Commit |
|------|-------|-----|--------|
| 21-05 | No UI for creating tags (UAT Test 5) | TagManager component on Settings page | 5f84f78 |
| 21-06 | Bulk tag only affected 1 transaction (UAT Test 10) | selectedIdsRef pattern for sync access | 7980c00 |

## Session Continuity

Last session: 2026-02-10
Status: Phase 21 gap closures verified (2/2 plans)
Resume file: None
Next step: /gsd:audit-milestone for v2.0 Statement Hub
