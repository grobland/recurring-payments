# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Users can see all their subscriptions in one place and never get surprised by a renewal again
**Current focus:** v2.0 Complete - Ready for v2.1 planning

## Current Position

Phase: (none active)
Plan: (none active)
Status: Milestone complete
Last activity: 2026-02-10 — v2.0 Statement Hub shipped

Progress: [=========================] 100% (5 milestones complete)

## Milestone Summary

### v2.0 Statement Hub (SHIPPED 2026-02-10)

**Phases:** 19-23 (5 phases, 21 plans)
**Requirements:** 27/27 complete
**Files modified:** 82 (10,886 insertions)
**LOC:** ~36,050 TypeScript

**Key accomplishments:**
- Batch PDF upload with sequential processing and duplicate detection
- Virtualized transaction browser with keyset pagination for 10k+ items
- Manual tagging and one-click subscription conversion with bulk operations
- Source dashboard with coverage visualization and re-import capability
- AI-powered pattern detection with auto-tagging during import
- Tag management UI in Settings page

## Archived Milestones

| Version | Name | Shipped | Phases | Plans | Requirements |
|---------|------|---------|--------|-------|--------------|
| v2.0 | Statement Hub | 2026-02-10 | 19-23 | 21 | 27/27 |
| v1.3 | Data & Intelligence | 2026-02-08 | 13-18 | 21 | 23/23 |
| v1.2 | Production Polish | 2026-02-05 | 9-12 | 10 | 19/19 |
| v1.1 | Import Improvements | 2026-02-02 | 5-8 | 11 | 18/18 |
| v1.0 | Get It Running | 2026-01-30 | 1-4 | 7 | 9/9 |

**Total:** 70 plans, 96 requirements validated

## Performance Metrics

**Velocity:**
- Total plans completed: 70
- Average duration: ~6 min
- Total execution time: ~442 min (~7.4 hours)

**By Milestone:**

| Milestone | Plans | Total | Avg/Plan |
|-----------|-------|-------|----------|
| v1.0 MVP | 7 | ~57 min | ~8 min |
| v1.1 Import Improvements | 11 | ~70 min | ~6 min |
| v1.2 Production Polish | 10 | ~70 min | ~7 min |
| v1.3 Data & Intelligence | 21 | ~149 min | ~7.1 min |
| v2.0 Statement Hub | 21 | ~96 min | ~4.4 min |

## Accumulated Context

### Key Patterns

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
| selectedIdsRef pattern | Sync ref access in async callbacks prevents stale closure |

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

## Session Continuity

Last session: 2026-02-10
Status: v2.0 milestone complete, tagged
Resume file: None
Next step: /gsd:new-milestone for v2.1 (Stripe billing and monetization)
