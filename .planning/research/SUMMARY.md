# Project Research Summary

**Project:** Subscription Manager v2.0 - Statement Hub
**Domain:** Batch import, statement data retention, statement browsing, manual enrichment
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

The v2.0 Statement Hub milestone transforms the subscription manager from single-file extraction to comprehensive statement management. Users can now upload multiple bank statements at once, browse all transaction line items (not just detected subscriptions), manually tag potential subscriptions, and strengthen AI pattern detection with historical data.

Research reveals three critical insights that define the Statement Hub architecture:

**1. Batch import is table stakes, not a differentiator** - In 2026, users expect to drag-and-drop 12+ months of statements at once. Single-file upload feels antiquated. Every modern fintech app supports batch uploads with real-time progress indicators. This is baseline UX, not a competitive advantage.

**2. Statement data retention enables the real value: manual enrichment** - The differentiator isn't just storing ALL line items - it's creating a collaborative intelligence loop. Users browse historical transactions, manually tag items AI missed, and teach the system what subscriptions look like. This transforms import from a one-time extraction to an ongoing enrichment workflow that gets smarter over time.

**3. Sequential processing prevents memory exhaustion** - Processing 12 PDFs simultaneously causes Node.js heap overflow (50-100MB per file × 12 = 600MB-1.2GB). The anti-pattern is parallel processing; the solution is sequential processing with streaming progress updates. Users see "Processing file 3 of 12" instead of a frozen spinner.

The recommended architecture extends existing patterns without disrupting current functionality. A new `statement_line_items` table stores ALL transactions from uploaded statements, linked to existing `import_audits` via foreign key. Line items can be tagged, filtered, and converted to subscriptions. When converted, a bidirectional link is established (`subscription.sourceLineItemId` and `lineItem.convertedToSubscriptionId`) enabling "show source statement" features.

The primary risks are **pagination performance collapse at scale** (OFFSET 10000 takes 30 seconds) and **unbounded table growth without archival** (millions of rows cause query slowdowns, index bloat, and backup issues). Prevention requires keyset (cursor-based) pagination from day 1 and table partitioning by user and date to enable time-based cleanup.

## Key Findings

### Recommended Stack Additions

Research shows the existing stack (Next.js 16, Drizzle ORM, PostgreSQL, OpenAI GPT-4o, React Dropzone) handles 90% of Statement Hub requirements. **Only one new dependency is needed:**

**@tanstack/react-virtual** (3.13.18, ~15KB)
- **Purpose:** Virtualized scrolling for statement browser with 10,000+ line items
- **Why:** Renders only visible rows (10-20 at a time) + buffer, reuses DOM elements, maintains 60fps with 10K+ rows
- **Alternative considered:** react-window (maintenance mode), AG Grid ($1,000/year)
- **Installation:** `npm install @tanstack/react-virtual@^3.13.18`

**What NOT to add:**
- OpenAI Batch API: 50% cost savings but 24-hour latency - users uploading 12 months expect instant feedback, not batch jobs
- MongoDB for statement storage: Adds new database, overkill - PostgreSQL handles millions of rows with partitioning
- Real-time WebSocket progress: Over-engineered - Server-Sent Events (built into Next.js ReadableStream) sufficient
- Automatic reconciliation across sources: Enterprise feature adds complexity users don't need for personal subscription tracking

### Architecture Components

**New database tables:**

1. **statement_line_items** (stores ALL transactions from statements)
   - Columns: merchantName, amount, currency, transactionDate, tags (JSONB array), aiConfidence, convertedToSubscriptionId
   - Indexes: userId + transactionDate (composite), merchantName (B-tree), tags (GIN for containment queries)
   - Partitioning: By user (HASH) then by month (RANGE) for time-based cleanup
   - Rationale: Structured schema enables filtering by merchant, date, tag (impossible with JSONB on import_audits)

2. **Extension to subscriptions table**
   - Add: sourceLineItemId (nullable FK to statement_line_items)
   - Rationale: Enables "show original statement line" feature, tracks conversion lineage

**Enhanced import flow:**

- Current flow (subscriptions-only) continues unchanged
- New flow adds `mode` parameter: "subscriptions" (default) or "full_statement"
- Full statement mode calls new GPT-4 prompt extracting ALL transactions (not just subscriptions)
- Line items bulk inserted with chunking (1,000 rows per batch to avoid query size limits)
- Progress streamed to client via ReadableStream (Server-Sent Events pattern)

**Statement browser architecture:**

- Query API with filters: `/api/statements/line-items?source=X&tagged=Y&from=date&to=date&cursor=Z`
- Keyset (cursor-based) pagination: Uses transactionDate cursor instead of OFFSET (constant time, not linear)
- Virtualized table: TanStack Virtual renders only visible rows, handles 10K+ items at 60fps
- Filter sidebar: Source, tags, date range (standard banking app pattern per research)

**Tagging and conversion flows:**

- Tag API: POST `/api/statements/line-items/[id]/tag` updates tags JSONB array (add/remove)
- Conversion API: POST `/api/subscriptions/from-line-item` creates subscription from line item, sets sourceLineItemId, marks line item as converted (prevents double-conversion)
- UI pattern: Inline combobox in table row (not modal) with recently-used subscriptions quick-access

### Feature Categorization

Based on analysis of 10+ fintech apps (MoneyWiz, PocketGuard, Expensify, YNAB) and enterprise reconciliation tools:

**Table Stakes (users EXPECT these):**
1. Batch PDF upload with drag-and-drop
2. Statement data retention (all line items stored)
3. Transaction browsing UI (filter, search, sort)
4. Duplicate detection during import (extended to statements)
5. Drag-and-drop file upload UX
6. Progress indicators for batch processing

**Differentiators (competitive advantage):**
7. Manual transaction tagging (mark as potential subscription)
8. Manual conversion (any item → subscription)
9. Source dashboard (overview cards per statement source)
10. AI suggestions from statement data (recurring pattern detection)
11. Re-import capability (import skipped items from previous statements)
12. Historical data strengthens pattern detection (12 months of data = better AI)

**Anti-Features (deliberately avoid):**
- Automatic reconciliation across multiple sources (enterprise complexity users don't need)
- Automated cash application (B2B feature, not relevant for personal subscriptions)
- Multi-currency reconciliation (scope creep, low demand)
- Transaction-level commenting/notes (<5% usage in research)
- Automatic category learning (ML complexity, premature optimization)
- Real-time import via Plaid (massive scope increase, security/privacy concerns)
- Transaction splitting (wrong use case for subscriptions)
- Budget tracking (feature creep, separate product direction)

### Critical Pitfalls

**Pitfall 1: Memory Exhaustion in Batch PDF Processing (CRITICAL)**
- **What:** Processing 12+ PDFs simultaneously causes Node.js heap overflow, crashing import
- **Why:** 50-page statement = 50-100MB memory; 12 files = 600MB-1.2GB exceeding Node default (512MB-1.7GB)
- **Prevention:** Process sequentially not in parallel, use streaming PDF libraries, increase heap to 4GB, store PDFs in S3/Supabase Storage not memory
- **Phase impact:** Must address in Phase 1 (Batch Upload) before UI work
- **Detection:** Monitor process.memoryUsage(), watch for "heap out of memory" errors

**Pitfall 2: Unbounded Table Growth Without Archival (CRITICAL)**
- **What:** Line items table grows to millions of rows causing query slowdowns, index bloat, backup issues
- **Why:** 50-200 items per statement × no cleanup = indefinite growth; PostgreSQL MVCC creates dead tuples
- **Prevention:** Partition table by user + date, implement 24-month retention policy, archive to S3, tune autovacuum for high-write tables
- **Phase impact:** Must design in Phase 2 (Statement Storage) - retrofitting partitioning requires full rebuild
- **Detection:** Query pgstattuple for bloat >30%, monitor table size growth rate (GB/month)

**Pitfall 3: Pagination Performance Collapse at Scale (CRITICAL)**
- **What:** Transaction browsing becomes unusable (20+ second page loads) when paginating deep with OFFSET
- **Why:** OFFSET 10000 forces database to scan and discard 10,000 rows; performance degrades linearly with depth
- **Prevention:** Use keyset (cursor-based) pagination with transactionDate cursor, create composite indexes, use BRIN indexes for time-series data
- **Phase impact:** Must implement in Phase 3 (Statement Browser) - changing pagination later breaks API
- **Detection:** Test pagination at page 100, 500, 1000; use EXPLAIN ANALYZE to check for Seq Scan

**Pitfall 4: Deduplication Logic Failure on Re-imports (CRITICAL)**
- **What:** Re-importing same statement creates duplicates or false negatives (missing items)
- **Why:** Naive hash of (date+amount+merchant) fails on merchant name variations, same-day charges, floating-point precision
- **Prevention:** Use composite fingerprint with fuzzy tolerance (normalized merchant + rounded amount + date ±2 days), store source file hash, implement idempotent import API
- **Phase impact:** Must design in Phase 2 before data accumulates - changing deduplication later requires backfilling
- **Detection:** Monitor duplicate rate via SQL query, test re-importing same file multiple times

**Pitfall 5: Manual Tags Lost on Re-import (CRITICAL)**
- **What:** User manually tags transactions, then re-imports statement - tags overwritten/deleted
- **Why:** Re-import logic treats all line items as new data, overwrites existing records
- **Prevention:** Never UPDATE line items (only INSERT with replacesId), track user_modified flag, implement tag preservation logic during re-import
- **Phase impact:** Must implement in Phase 4 (Manual Tagging) - fixing later requires data recovery from backups
- **Detection:** Track manual tag count before/after re-import, add audit log for tag deletions

### Moderate Pitfalls

**Pitfall 6: Transaction Browser Filter Performance (IMPORTANT)**
- Generic indexes don't cover filter combinations causing 10+ second query times
- Prevention: Create partial indexes for common filter combos, use PostgreSQL full-text search for merchant, pre-filter by userId
- Detection: Test filters with 100K+ rows, use EXPLAIN ANALYZE

**Pitfall 7: Batch Import Progress Not Saved on Failure (IMPORTANT)**
- Import fails on file 8 of 12, user must re-upload all 12 files
- Prevention: Process and persist each file independently, store per-file status, allow resuming failed batch
- Detection: Kill import mid-batch, check if partial progress saved

**Pitfall 8: No Loading State for Long Batch Imports (IMPORTANT)**
- User uploads 12 files, sees spinner for 5 minutes with no feedback, thinks app froze
- Prevention: Use Server-Sent Events for real-time progress, show per-file status, display estimated time remaining
- Detection: Upload 12 files and monitor user confusion in testing

**Pitfall 9: Statement Browser Mobile UX Breaks (MODERATE)**
- Table with 10 columns doesn't fit on mobile, horizontal scrolling feels broken
- Prevention: Use card layout on mobile, table on desktop; show only essential columns (date, merchant, amount)
- Detection: Test on real mobile device

**Pitfall 10: Tagging UX Requires Too Many Clicks (MODERATE)**
- Tagging requires: click row → dialog → search → select → save; users give up after 5-10 items
- Prevention: Inline combobox in table row, keyboard shortcuts, bulk actions, recently-used subscriptions quick-access
- Detection: User test "tag 20 transactions", track average time per tag

## Implications for Roadmap

Based on combined research, suggested phase structure prioritizes foundational data storage, then UI for browsing/enrichment, then intelligence features:

### Phase 1: Batch Upload Foundation (Week 1-2)
**Rationale:** Core feature that users expect; establishes sequential processing pattern preventing memory issues; foundational for all other phases.

**Delivers:**
- Database: `statement_line_items` table with partitioning, indexes, relations
- Database: `sourceLineItemId` column on `subscriptions` table
- Import API: Enhanced `/api/import` with `mode` parameter ("subscriptions" | "full_statement")
- Parser: New `statement-parser.ts` with GPT-4 prompt for ALL transactions
- Batch API: `/api/statements/line-items/batch` for bulk inserts with chunking
- UI: Drag-and-drop upload zone with progress indicators
- UI: Mode toggle in import page (subscriptions-only vs full statement)

**Stack:** Drizzle ORM (schema), OpenAI GPT-4o (extended prompt), React Dropzone (existing), Next.js ReadableStream (progress)

**Addresses:** Batch PDF upload (#1 table stakes), statement data retention (#2 table stakes), drag-and-drop UX (#5 table stakes), progress indicators (#6 table stakes)

**Avoids:** Memory exhaustion (Pitfall #1 - critical) via sequential processing, unbounded table growth (Pitfall #2 - critical) via partitioning design, deduplication failure (Pitfall #4 - critical) via fingerprinting logic

**Research flags:** None - patterns well-established

**Estimated Effort:** 8-10 days (includes schema design, migration, API implementation, UI components)

---

### Phase 2: Statement Browser & Filtering (Week 3-4)
**Rationale:** Must be able to browse retained data; establishes filtering patterns and pagination strategy before data accumulates.

**Delivers:**
- Query API: `/api/statements/line-items` GET with filters (source, tagged, date range, cursor)
- Browser page: `/statements` with virtualized table using TanStack Virtual
- Filter sidebar: Source filter, tag filter, date range picker
- Keyset pagination: Cursor-based with transactionDate
- Duplicate detection: Extended to statements (file hash checking)
- Empty states: "No statements uploaded yet" with upload CTA

**Stack:** @tanstack/react-virtual (NEW - 15KB), TanStack Table (existing), shadcn/ui components (existing)

**Addresses:** Transaction browsing UI (#3 table stakes), duplicate detection (#4 table stakes)

**Avoids:** Pagination performance collapse (Pitfall #3 - critical) via keyset pagination, filter performance issues (Pitfall #6 - important) via composite indexes, mobile UX breaks (Pitfall #9 - moderate) via responsive design

**Research flags:** None - TanStack Virtual and keyset pagination are proven patterns

**Estimated Effort:** 6-8 days (includes API with complex filtering, virtualized table, filter UI, pagination)

---

### Phase 3: Manual Tagging & Conversion (Week 5-6)
**Rationale:** Core differentiator - enables users to enrich data AI missed; establishes collaborative intelligence loop.

**Delivers:**
- Tag API: POST `/api/statements/line-items/[id]/tag` for add/remove tags
- Conversion API: POST `/api/subscriptions/from-line-item` with pre-filled data
- Tag UI: Inline combobox in table rows with recently-used subscriptions
- Bulk actions: "Tag selected items" for multi-select
- Conversion modal: Pre-filled form with line item data (merchant, amount, frequency)
- Converted badge: Visual indicator showing which items became subscriptions
- Tag preservation: Logic to prevent losing manual tags on re-import

**Stack:** shadcn/ui Combobox, Drizzle ORM (JSONB updates), existing subscription creation flow

**Addresses:** Manual tagging (#7 differentiator), manual conversion (#8 differentiator)

**Avoids:** Manual tags lost on re-import (Pitfall #5 - critical) via user_modified flag, tagging UX friction (Pitfall #10 - moderate) via inline editing and bulk actions

**Research flags:** None - tag preservation patterns documented in Modern Treasury research

**Estimated Effort:** 5-7 days (includes tag API, conversion API, inline editing UI, bulk actions)

---

### Phase 4: Source Dashboard & Re-import (Week 7-8)
**Rationale:** Quick overview of data coverage; enables users to fix initial import mistakes; low-complexity enhancements.

**Delivers:**
- Source Dashboard: Grid of cards showing statements per source (count, date range, total items)
- Aggregation query: GROUP BY source with counts
- Re-import UI: Statement detail view showing all items (imported vs skipped)
- Import status: Visual indicators (✅ imported, ⭕ skipped)
- Import from detail: "Import this item" button on skipped items
- Partial import tracking: Per-file status (pending, processing, completed, failed)
- Resume capability: Continue failed batch from last successful file

**Stack:** shadcn/ui Cards, existing query patterns, reuse conversion flow from Phase 3

**Addresses:** Source dashboard (#9 differentiator), re-import capability (#11 differentiator)

**Avoids:** Batch progress not saved (Pitfall #7 - important) via per-file status tracking, no loading state (Pitfall #8 - important) via detailed progress UI

**Research flags:** None - dashboard aggregations and status tracking are standard patterns

**Estimated Effort:** 4-6 days (includes aggregation queries, dashboard UI, detail view, resume logic)

---

### Phase 5: AI Suggestions & Pattern Detection (Week 9-10)
**Rationale:** Leverages historical statement data to strengthen existing pattern detection (v1.3); proactive user value.

**Delivers:**
- Extended pattern detection: Scan `statement_line_items` not just `subscriptions`
- Recurring pattern detection: Same merchant, 3+ occurrences, monthly frequency
- Suggestion dashboard: "We found 2 potential subscriptions" with confidence scores
- Evidence display: List of matching transactions supporting suggestion
- Accept/dismiss actions: One-click add or permanent dismissal
- Tag integration: Auto-tag high-confidence items (>80%) as "potential_subscription"

**Stack:** Extend existing pattern detection algorithm (v1.3), Drizzle ORM queries, confidence scoring

**Addresses:** AI suggestions (#10 differentiator), historical pattern detection (#12 differentiator)

**Avoids:** False positive suggestions by requiring 3+ occurrences, showing evidence not just confidence, allowing dismissals

**Research flags:** Possible - if initial confidence thresholds generate too many false positives, may need `/gsd:research-phase` to tune; start conservatively (85% threshold)

**Estimated Effort:** 5-7 days (includes pattern detection extension, suggestion UI, accept/dismiss flows)

---

### Phase Ordering Rationale

- **Phase 1 is foundation:** All other phases depend on statement data storage
- **Phase 2 before 3:** Must be able to browse data before tagging it
- **Phase 3 before 4:** Conversion flow reused in re-import
- **Phase 5 last:** Requires historical data from imports, benefits from tag data from Phase 3

**Parallelization opportunity:** None - phases have strict dependencies

**Total estimated effort:** 28-38 days (5.6-7.6 weeks) for full Statement Hub milestone

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (AI Suggestions):** Confidence threshold tuning is user-specific; may need additional research if false positive rate >20%; consider `/gsd:research-phase` after initial implementation with real data

Phases with standard patterns (skip research-phase):
- **Phase 1 (Batch Upload):** Sequential processing, streaming progress, and partitioning are well-documented patterns
- **Phase 2 (Statement Browser):** Keyset pagination and virtualized tables are proven at scale
- **Phase 3 (Manual Tagging):** Tag preservation and inline editing patterns documented in fintech research
- **Phase 4 (Source Dashboard):** Aggregation queries and status tracking are standard database patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 1 new dependency (@tanstack/react-virtual); all other capabilities use existing stack (Drizzle, OpenAI, React Dropzone, Next.js); npm package widely adopted (3.13.18 stable) |
| Features | HIGH | Table stakes clear from 10+ fintech app research (MoneyWiz, PocketGuard, Expensify, YNAB); differentiators validated by Modern Treasury transaction tagging patterns |
| Architecture | HIGH | Extends existing schema cleanly (additive only); keyset pagination and partitioning are proven PostgreSQL patterns; TanStack Virtual is industry standard for large lists |
| Pitfalls | HIGH | Memory exhaustion documented in Node.js limits research; pagination performance and table bloat documented in PostgreSQL optimization guides; deduplication issues covered in Modern Treasury case studies |

**Overall confidence:** HIGH

### Gaps to Address

Areas where research was conclusive but implementation needs validation:

- **Optimal partition strategy:** Research shows monthly partitioning recommended for time-series data, but actual partition size depends on statement volume per user; start with monthly partitions, monitor partition size (target: 10K-100K rows per partition); if partitions grow >500K rows, consider weekly partitioning

- **Sequential processing timeout:** Research shows 12 PDFs × 20 seconds/file = 4 minutes total; Vercel Pro has 60-second timeout per request; must use background job queue (Vercel cron + status polling) or streaming response that maintains connection; validate timeout doesn't kill long-running imports

- **Keyset pagination with filters:** Cursor-based pagination requires stable sort key; when filtering by merchant + date, cursor must include both fields; validate cursor serialization handles multi-column cursors correctly

- **TanStack Virtual row height:** Virtualization requires estimated row height (default: 50px); if transaction descriptions vary significantly, may need dynamic height measurement; validate scrolling feels smooth with real statement data

- **Tag preservation edge cases:** Research shows tag preservation should prevent overwrites, but what if user re-imports with conflicting data (e.g., amount changed)?; validate merge logic with production scenarios; may need conflict resolution UI

- **Statement file hash uniqueness:** Using SHA-256 hash of PDF contents assumes byte-identical files are duplicates; some banks regenerate PDFs with different metadata but same transactions; validate file hash approach with multiple bank statement formats; may need content-based hashing (transactions only) instead of file-based

## Sources

### Primary (HIGH confidence)

**Stack:**
- [TanStack Virtual Official Docs](https://tanstack.com/virtual/latest) - Official documentation for virtualized scrolling (3.13.18 stable)
- [@tanstack/react-virtual npm](https://www.npmjs.com/package/@tanstack/react-virtual) - Package details, 15KB bundle size
- [Drizzle ORM Batch API](https://orm.drizzle.team/docs/batch-api) - Batch inserts with chunking
- [Next.js Streaming Guide](https://nextjs.org/learn/dashboard-app/streaming) - ReadableStream for progress updates

**Features:**
- [Key Features Every Personal Finance App Needs in 2026](https://financialpanther.com/key-features-every-personal-finance-app-needs-in-2026/) - Table stakes validation
- [MoneyWiz 2026](https://apps.apple.com/us/app/moneywiz-2026-personal-finance/id1511185140) - Transaction browsing patterns
- [PocketGuard Features](https://pocketguard.com/) - Filtering and categorization UX
- [Modern Treasury Transaction Tagging](https://www.moderntreasury.com/journal/transaction-tagging-transforming-raw-bank-data-into-real-insights) - Tagging system design, manual enrichment patterns

**Architecture:**
- [PostgreSQL Partitioning Best Practices](https://oneuptime.com/blog/post/2026-01-25-postgresql-optimize-billion-row-tables/view) - Partitioning for large tables
- [Keyset Pagination for Large Datasets](https://oneuptime.com/blog/post/2026-02-02-keyset-pagination/view) - Cursor-based pagination implementation
- [Building Virtualized Table with TanStack](https://dev.to/ainayeem/building-an-efficient-virtualized-table-with-tanstack-virtual-and-react-query-with-shadcn-2hhl) - Integration patterns
- [Financial Data Retention Policies](https://atlan.com/know/data-governance/data-retention-policies-in-finance/) - 24-month retention standards

**Pitfalls:**
- [Batch Processing Large Datasets in Node.js Without Running Out of Memory](https://dev.to/rabbitramang/batch-processing-large-datasets-in-nodejs-without-running-out-of-memory-9a1) - Memory exhaustion prevention
- [How to Reduce Bloat in Large PostgreSQL Tables](https://www.tigerdata.com/learn/how-to-reduce-bloat-in-large-postgresql-tables) - Table bloat mitigation
- [Handling Large Datasets: Optimizing Pagination, Sorting & Filtering](https://medium.com/@jatin.jain_69313/handling-large-datasets-high-traffic-queries-optimizing-pagination-sorting-filtering-bf9a2d5a9813) - Pagination performance
- [Deduplication at Scale](https://www.moderntreasury.com/journal/deduplication-at-scale) - Deduplication strategies, fingerprinting patterns

### Secondary (MEDIUM confidence)

- [File Upload UX Best Practices](https://uploadcare.com/blog/file-uploader-ux-best-practices/) - Drag-and-drop patterns
- [Drag-and-Drop UX Guidelines](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/) - Interaction design best practices
- [NetSuite Bank Statement Import](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N1550803.html) - Enterprise import patterns
- [Data Archiving in PostgreSQL](https://dataegret.com/2025/05/data-archiving-and-retention-in-postgresql-best-practices-for-large-datasets/) - Archival strategies

### Codebase Analysis (HIGH confidence)

- `src/lib/db/schema.ts` - Existing schema structure, import_audits table, subscriptions table
- `src/app/api/import/route.ts` - Current import flow, OpenAI integration
- `src/lib/openai/pdf-parser.ts` - GPT-4 prompt structure, DetectedSubscription interface
- `.planning/phases/06-statement-source-tracking/06-RESEARCH.md` - Statement source tracking patterns
- `CLAUDE.md` - Tech stack (Next.js 16, Drizzle ORM, Supabase PostgreSQL, OpenAI GPT-4o)

---

*Research completed: 2026-02-08*
*Ready for roadmap: yes*
