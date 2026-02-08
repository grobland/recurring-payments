# Domain Pitfalls: Statement Hub Features

**Domain:** Batch Import, Statement Data Retention, Statement Browsing
**Context:** Adding these features to existing subscription manager
**Researched:** 2026-02-08

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or major performance issues.

### Pitfall 1: Memory Exhaustion in Batch PDF Processing

**What goes wrong:** Processing 12+ PDFs simultaneously causes Node.js heap memory overflow, crashing the import process and losing all user progress.

**Why it happens:** PDF libraries (pdf-lib, pdf-parse) load entire documents into memory. A 50-page statement can consume 50-100MB per file. Processing 12 files at once = 600MB-1.2GB memory usage, exceeding Node.js default heap limits (512MB-1.7GB).

**Consequences:**
- Import fails silently or with cryptic "heap out of memory" errors
- User loses all work (no partial progress saved)
- Server becomes unresponsive during processing
- OpenAI API calls may succeed but results are lost when process crashes

**Prevention:**

1. **Process PDFs sequentially, not in parallel**
```typescript
// BAD - All PDFs in memory at once
const results = await Promise.all(
  files.map(file => extractTextFromPDF(file))
);

// GOOD - One at a time with streaming
for (const file of files) {
  const text = await extractTextFromPDF(file);
  await processWithOpenAI(text);
  // File memory released before next iteration
}
```

2. **Use streaming PDF libraries**
```typescript
// Use pdfreader for large files (streaming, event-driven)
// NOT pdf-parse (loads entire file)
import { PdfReader } from 'pdfreader';

// Process page-by-page, not all-at-once
```

3. **Increase Node.js heap limit**
```bash
# In package.json or deployment config
NODE_OPTIONS="--max-old-space-size=4096"
```

4. **Store PDFs externally**
```typescript
// Store in S3/Supabase Storage, pass URLs not buffers
const fileUrl = await uploadToStorage(file);
const extractionJob = await queueExtraction(fileUrl);
```

**Detection:**
- Monitor `process.memoryUsage()` during imports
- Watch for "JavaScript heap out of memory" errors
- Track import failure rate vs file count correlation
- Server CPU/memory spikes during batch imports

**Phase impact:** Must address in Phase 1 (Batch Upload Infrastructure) before UI work. Without this, batch feature is unusable.

**Severity:** CRITICAL

---

### Pitfall 2: Unbounded Table Growth Without Archival Strategy

**What goes wrong:** Statement line items table grows to millions of rows (1000s per user × 1000s of users), causing query slowdowns, index bloat, and backup/restore issues.

**Why it happens:** Every statement import adds 50-200 line items. With no archival or cleanup, table grows indefinitely. PostgreSQL MVCC creates "dead tuples" on updates, causing bloat. Autovacuum can't keep up with write volume.

**Consequences:**
- Queries slow to 10-30 seconds for transaction browsing
- Database size explodes (10GB → 100GB+ within months)
- Backups take hours instead of minutes
- Index maintenance consumes CPU during peak hours
- Cost escalation on Supabase (storage + compute)

**Prevention:**

1. **Partition table by user and date**
```sql
-- Partition by user_id for data isolation
-- Sub-partition by month for time-based cleanup
CREATE TABLE statement_line_items (
  id uuid,
  user_id uuid NOT NULL,
  transaction_date date NOT NULL,
  -- other columns
) PARTITION BY HASH (user_id);

-- Create partitions per user
CREATE TABLE statement_line_items_u1 PARTITION OF statement_line_items
  FOR VALUES WITH (MODULUS 10, REMAINDER 0)
  PARTITION BY RANGE (transaction_date);
```

2. **Implement data retention policy**
```typescript
// Keep only last 24 months of line items
// Archive older data to cold storage (S3 + CSV)
const retentionMonths = 24;
const archiveThreshold = subMonths(new Date(), retentionMonths);

// Nightly cron: archive old data
await archiveToS3(user.id, archiveThreshold);
await db.delete(statementLineItems)
  .where(
    and(
      eq(statementLineItems.userId, user.id),
      lt(statementLineItems.transactionDate, archiveThreshold)
    )
  );
```

3. **Tune autovacuum for high-write tables**
```sql
-- Default: vacuum after 20% of rows change (too high for large tables)
ALTER TABLE statement_line_items SET (
  autovacuum_vacuum_scale_factor = 0.01, -- Vacuum after 1% change
  autovacuum_analyze_scale_factor = 0.005,
  autovacuum_vacuum_cost_limit = 1000 -- Speed up vacuum
);
```

4. **Use pg_repack or VACUUM FULL annually**
```bash
# Reclaim dead tuple space without table locking
pg_repack --table statement_line_items
```

**Detection:**
- Query `pgstattuple` for bloat percentage (>30% = problem)
- Monitor table size growth rate (GB/month)
- Track query duration on transaction list page (p95 > 3s = problem)
- Autovacuum lag (dead tuples accumulating)

**Phase impact:** Must design in Phase 2 (Statement Storage Schema). Retrofitting partitioning later requires full table rebuild.

**Severity:** CRITICAL

---

### Pitfall 3: Pagination Performance Collapse at Scale

**What goes wrong:** Transaction browsing becomes unusable (20+ second page loads) when paginating deep into dataset using OFFSET-based pagination.

**Why it happens:** `OFFSET 10000 LIMIT 50` forces database to scan and discard 10,000 rows before returning 50. Performance degrades linearly with offset depth.

**Consequences:**
- Page 1 loads in 200ms, page 200 loads in 30 seconds
- Users can't browse historical transactions beyond first few pages
- Database CPU spikes when multiple users paginate deeply
- Timeout errors on deep pages

**Prevention:**

1. **Use keyset (cursor-based) pagination**
```typescript
// BAD - Offset pagination (slow for deep pages)
const items = await db
  .select()
  .from(statementLineItems)
  .where(eq(statementLineItems.userId, userId))
  .orderBy(desc(statementLineItems.transactionDate))
  .offset((page - 1) * 50)
  .limit(50);

// GOOD - Keyset pagination (constant time)
const items = await db
  .select()
  .from(statementLineItems)
  .where(
    and(
      eq(statementLineItems.userId, userId),
      cursor ? lt(statementLineItems.transactionDate, cursor) : undefined
    )
  )
  .orderBy(desc(statementLineItems.transactionDate))
  .limit(50);

// Return last item's date as cursor for next page
return {
  items,
  nextCursor: items[items.length - 1]?.transactionDate
};
```

2. **Create composite indexes for filtered queries**
```sql
-- Index covering userId + date + amount for common filters
CREATE INDEX idx_line_items_user_date_amount
  ON statement_line_items (user_id, transaction_date DESC, amount);

-- Partial index for untagged items filter
CREATE INDEX idx_line_items_untagged
  ON statement_line_items (user_id, transaction_date DESC)
  WHERE subscription_id IS NULL;
```

3. **Use BRIN indexes for time-series data**
```sql
-- For large tables with sequential inserts
CREATE INDEX idx_line_items_date_brin
  ON statement_line_items
  USING BRIN (transaction_date);
-- Much smaller than B-tree, good for range scans
```

**Detection:**
- Test pagination at page 100, 500, 1000 during development
- Monitor query duration by OFFSET value (should be flat, not linear)
- Use `EXPLAIN ANALYZE` to check for "Seq Scan" on large offsets

**Phase impact:** Must implement in Phase 3 (Statement Browser UI). Changing pagination strategy later requires API breaking changes.

**Severity:** CRITICAL

---

### Pitfall 4: Deduplication Logic Failure on Re-imports

**What goes wrong:** Re-importing the same statement creates duplicate line items or false negatives (missing items user expects).

**Why it happens:** Statement re-imports are common (user fixes account name, re-processes with better AI prompt). Naive deduplication using hash of (date + amount + merchant) fails because:
- Merchants have slight name variations ("Netflix" vs "NETFLIX INC")
- Multiple legitimate charges on same date from same merchant (Uber rides)
- Floating-point amount precision mismatches ($10.00 vs $9.99999)

**Consequences:**
- Duplicate transactions confuse users and break analytics
- False positives: legitimate charges rejected as duplicates
- False negatives: actual duplicates slip through
- Data integrity erosion over time

**Prevention:**

1. **Use composite fingerprint with fuzzy tolerance**
```typescript
// Generate stable fingerprint for deduplication
function generateTransactionFingerprint(tx: Transaction): string {
  const normalizedMerchant = tx.merchant
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // "Netflix Inc." -> "NETFLIXINC"

  const roundedAmount = Math.round(tx.amount * 100) / 100; // Normalize cents

  const datePlusMinus2Days = [
    subDays(tx.date, 2),
    subDays(tx.date, 1),
    tx.date,
    addDays(tx.date, 1),
    addDays(tx.date, 2)
  ].map(d => format(d, 'yyyy-MM-dd')).join('|');

  // Hash combination
  return createHash('sha256')
    .update(`${normalizedMerchant}:${roundedAmount}:${datePlusMinus2Days}`)
    .digest('hex');
}

// Check for duplicates before inserting
const fingerprint = generateTransactionFingerprint(item);
const existing = await db
  .select()
  .from(statementLineItems)
  .where(
    and(
      eq(statementLineItems.userId, userId),
      eq(statementLineItems.fingerprint, fingerprint)
    )
  )
  .limit(1);

if (existing.length > 0) {
  // Skip duplicate
  continue;
}
```

2. **Store import source file hash**
```typescript
// Track which file each line item came from
const fileHash = createHash('sha256')
  .update(fileBuffer)
  .digest('hex');

await db.insert(statementLineItems).values({
  // ... other fields
  sourceFileHash: fileHash,
  importAuditId: auditId
});

// On re-import: if file hash matches, skip entire file
const existingImport = await db
  .select()
  .from(importAudits)
  .where(
    and(
      eq(importAudits.userId, userId),
      eq(importAudits.sourceFileHash, fileHash)
    )
  );

if (existingImport.length > 0) {
  return { status: 'already_imported', auditId: existingImport[0].id };
}
```

3. **Implement idempotent import API**
```typescript
// Import API should be safe to retry without side effects
POST /api/import/confirm
{
  idempotency_key: "import_2026-02-08_user123_file456",
  // ... import data
}

// Store idempotency key in import_audits
// Subsequent calls with same key return original result
```

**Detection:**
- Monitor duplicate rate: `SELECT merchant, date, COUNT(*) FROM items GROUP BY merchant, date HAVING COUNT(*) > 1`
- Track user complaints about missing or duplicate transactions
- Test re-importing same file multiple times in E2E tests

**Phase impact:** Must design in Phase 2 (Statement Storage Schema) before data accumulates. Changing deduplication logic later requires backfilling fingerprints.

**Severity:** CRITICAL

---

### Pitfall 5: Manual Tag Overwrites Lost on Re-import

**What goes wrong:** User manually tags a transaction with a subscription. Then re-imports the statement (fixing account name). Manual tag is overwritten or deleted.

**Why it happens:** Re-import logic doesn't preserve user modifications. It treats all line items as new data, overwriting existing records.

**Consequences:**
- Users lose hours of manual tagging work
- Trust in system eroded
- User complaints and support burden
- Data integrity issues (subscriptions lose tagged transactions)

**Prevention:**

1. **Never UPDATE line items, only INSERT new ones**
```typescript
// BAD - Updates destroy manual tags
await db.update(statementLineItems)
  .set({ merchant: newName })
  .where(eq(statementLineItems.id, itemId));

// GOOD - Insert new row, mark old as replaced
await db.insert(statementLineItems).values({
  ...existingItem,
  id: uuid(), // New ID
  replacesId: existingItem.id,
  importAuditId: newAuditId
});

// Keep old row with manual tags
// Query filters: WHERE replacesId IS NULL
```

2. **Track user modifications with flag**
```sql
-- Add column to track manual edits
ALTER TABLE statement_line_items ADD COLUMN user_modified BOOLEAN DEFAULT FALSE;

-- Set flag when user tags transaction
UPDATE statement_line_items
SET subscription_id = $1, user_modified = TRUE
WHERE id = $2;

-- On re-import: skip items with user_modified = TRUE
```

3. **Implement tag preservation logic**
```typescript
// When re-importing, preserve manual tags
const existingTags = await db
  .select()
  .from(statementLineItems)
  .where(
    and(
      eq(statementLineItems.userId, userId),
      eq(statementLineItems.fingerprint, fingerprint),
      isNotNull(statementLineItems.subscriptionId) // Has manual tag
    )
  );

// Merge tags into new import
newItems.forEach(item => {
  const existing = existingTags.find(e =>
    e.fingerprint === item.fingerprint
  );
  if (existing?.subscriptionId) {
    item.subscriptionId = existing.subscriptionId; // Preserve tag
  }
});
```

**Detection:**
- Track manual tag count before/after re-import
- Add audit log for tag deletions
- User testing: tag a transaction, re-import statement, verify tag persists

**Phase impact:** Must implement in Phase 4 (Manual Tagging System). Fixing this later requires data recovery from backups.

**Severity:** CRITICAL

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded UX.

### Pitfall 6: Transaction Browser Lacks Filter Performance

**What goes wrong:** Applying filters (date range, amount range, merchant search) causes 10+ second query times, making browser unusable.

**Why it happens:** Generic indexes don't cover filter combinations. Full table scans required for complex queries.

**Prevention:**
- Create partial indexes for common filter combinations
- Use PostgreSQL full-text search for merchant name filtering
- Pre-filter by userId before applying other filters
```sql
-- Composite index for common filter combo
CREATE INDEX idx_line_items_user_date_amount_merchant
  ON statement_line_items (user_id, transaction_date DESC, amount, merchant);

-- Full-text search index for merchant
CREATE INDEX idx_line_items_merchant_fts
  ON statement_line_items
  USING gin(to_tsvector('english', merchant));
```

**Detection:**
- Test filters with 100K+ rows in local DB
- Monitor query duration by filter type
- Use `EXPLAIN ANALYZE` during development

**Severity:** IMPORTANT

---

### Pitfall 7: Batch Import Progress Not Saved on Failure

**What goes wrong:** Batch import fails on file 8 of 12. User must re-upload all 12 files and re-process 1-7.

**Why it happens:** Import treated as single transaction. Partial progress not persisted.

**Prevention:**
- Process and persist each file independently
- Store per-file import status (pending, processing, completed, failed)
- Allow resuming failed batch from last successful file
```typescript
// Store per-file status
const batchId = uuid();
for (const file of files) {
  await db.insert(importFiles).values({
    batchId,
    fileName: file.name,
    status: 'pending'
  });
}

// Process each file independently
for (const fileRecord of files) {
  try {
    await processFile(fileRecord);
    await db.update(importFiles)
      .set({ status: 'completed' })
      .where(eq(importFiles.id, fileRecord.id));
  } catch (error) {
    await db.update(importFiles)
      .set({ status: 'failed', errorMessage: error.message })
      .where(eq(importFiles.id, fileRecord.id));
    // Continue to next file instead of failing entire batch
  }
}
```

**Detection:**
- Kill import process mid-batch, check if partial progress saved
- Test error scenarios (corrupted PDF, API timeout)

**Severity:** IMPORTANT

---

### Pitfall 8: No Loading State for Long Batch Imports

**What goes wrong:** User uploads 12 files, sees spinner, waits 5 minutes with no feedback, thinks app froze.

**Why it happens:** Batch processing takes 20-60 seconds per file (PDF extraction + OpenAI API). No progress indication.

**Prevention:**
- Use WebSockets or SSE for real-time progress updates
- Show per-file status (File 3 of 12 processing...)
- Display estimated time remaining
- Allow canceling in-progress batch
```typescript
// Server sends progress via SSE
const sendProgress = (fileNum: number, total: number, status: string) => {
  res.write(`data: ${JSON.stringify({
    current: fileNum,
    total,
    status,
    percent: Math.round((fileNum / total) * 100)
  })}\n\n`);
};

// Client displays progress
<Progress value={progress.percent} />
<p>Processing file {progress.current} of {progress.total}...</p>
```

**Detection:**
- Upload 12 files and monitor user confusion in testing
- Track support tickets about "app frozen during import"

**Severity:** IMPORTANT

---

### Pitfall 9: Statement Browser Mobile UX Breaks

**What goes wrong:** Transaction table with 10 columns doesn't fit on mobile. Horizontal scrolling feels broken.

**Why it happens:** Desktop-first design. Table component not responsive.

**Prevention:**
- Use card layout on mobile, table on desktop
- Show only essential columns on mobile (date, merchant, amount)
- Expand to full details on tap
```typescript
// Responsive component
{isMobile ? (
  <div className="space-y-2">
    {items.map(item => (
      <Card key={item.id}>
        <CardContent className="p-4">
          <div className="flex justify-between">
            <div>
              <p className="font-medium">{item.merchant}</p>
              <p className="text-sm text-muted-foreground">
                {format(item.date, 'MMM d, yyyy')}
              </p>
            </div>
            <p className="font-semibold">{formatCurrency(item.amount)}</p>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
) : (
  <Table>
    {/* Desktop table */}
  </Table>
)}
```

**Detection:**
- Test on real mobile device (not just browser DevTools)
- Check Playwright E2E tests on mobile viewport

**Severity:** MODERATE

---

### Pitfall 10: Tagging UX Requires Too Many Clicks

**What goes wrong:** Tagging a transaction requires: click row → open dialog → search subscription → select → save. Users give up after tagging 5-10 items.

**Why it happens:** Desktop CRUD patterns don't scale for bulk operations.

**Prevention:**
- Inline combobox in table row (click directly on tag cell)
- Keyboard shortcuts (select row, press 'T' to tag)
- Bulk actions (select multiple rows, tag all at once)
- Recently used subscriptions quick-access
```typescript
// Inline editing with shadcn Combobox
<TableCell>
  {editingRowId === row.id ? (
    <SubscriptionCombobox
      value={row.subscriptionId}
      onChange={(value) => {
        handleTag(row.id, value);
        setEditingRowId(null);
      }}
      recentSubscriptions={recentTags} // Quick access
    />
  ) : (
    <button onClick={() => setEditingRowId(row.id)}>
      {row.subscription?.name || 'Untagged'}
    </button>
  )}
</TableCell>
```

**Detection:**
- User test: "Tag 20 transactions from this list"
- Track average time per tag
- Monitor tag abandonment rate (how many users tag 1 item then quit)

**Severity:** MODERATE

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 11: Date Range Filter Doesn't Account for Timezones

**What goes wrong:** User selects "January 2026" filter. Sees transactions from December 2025 due to UTC vs local time conversion.

**Why it happens:** Storing timestamps with timezone but comparing dates naively.

**Prevention:**
```typescript
// Store transaction_date as DATE, not TIMESTAMP
transaction_date DATE NOT NULL

// Or if using timestamp, convert to user timezone
const userTz = user.timezone || 'America/New_York';
const startDate = zonedTimeToUtc(dateRange.start, userTz);
const endDate = zonedTimeToUtc(dateRange.end, userTz);
```

**Detection:** Test with user in different timezone than server

**Severity:** MINOR

---

### Pitfall 12: Export to CSV Fails with Large Datasets

**What goes wrong:** User clicks "Export to CSV" for 10,000 transactions. Server times out or browser crashes loading massive file.

**Why it happens:** Trying to load and serialize entire dataset in memory.

**Prevention:**
- Stream CSV generation
- Limit export to 5,000 rows with warning
- Generate export asynchronously, email download link
```typescript
// Stream CSV response
res.setHeader('Content-Type', 'text/csv');
res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');

const stream = db
  .select()
  .from(statementLineItems)
  .where(eq(statementLineItems.userId, userId))
  .stream(); // Don't load all into memory

for await (const row of stream) {
  res.write(`${row.date},${row.merchant},${row.amount}\n`);
}
res.end();
```

**Detection:** Try exporting 50K+ rows in development

**Severity:** MINOR

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Batch Upload | Pitfall 1 (Memory exhaustion) | Use sequential processing + streaming PDF library |
| Phase 2: Statement Storage | Pitfall 2 (Table bloat), Pitfall 4 (Deduplication) | Design partitioning + fingerprinting upfront |
| Phase 3: Statement Browser | Pitfall 3 (Pagination performance) | Use keyset pagination from day 1 |
| Phase 4: Manual Tagging | Pitfall 5 (Tags lost on re-import) | Never UPDATE, only INSERT + mark replaced |
| Phase 5: Re-import | Pitfall 7 (No progress saved) | Per-file status tracking |

---

## Integration Pitfalls with Existing System

Specific to adding Statement Hub to this subscription manager.

### Pitfall 13: Statement Line Items Schema Doesn't Reference Existing subscriptions Table

**What goes wrong:** Creating separate `statement_transactions` table without foreign key to `subscriptions` table. Manual tagging system can't enforce referential integrity.

**Why it happens:** Designing new schema in isolation without considering integration points.

**Prevention:**
```sql
CREATE TABLE statement_line_items (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,

  -- Link to existing subscription when tagged
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Other fields...
);
```

**Detection:** Try deleting a subscription that has tagged transactions. Does it fail gracefully?

**Severity:** IMPORTANT

---

### Pitfall 14: Existing import_audits Table Not Extended for Line Items

**What goes wrong:** New statement imports don't update `import_audits.confirmedCount` to include line item imports, only subscription imports.

**Why it happens:** Forgetting to update existing audit logic when adding new feature.

**Prevention:**
- Extend `import_audits` to track both subscription imports AND line item imports
- Add columns: `lineItemsImported`, `lineItemsDuplicate`
```sql
ALTER TABLE import_audits
  ADD COLUMN line_items_imported INTEGER DEFAULT 0,
  ADD COLUMN line_items_duplicate INTEGER DEFAULT 0;
```

**Detection:** Import statement with line items, check import_audits shows both counts

**Severity:** MODERATE

---

### Pitfall 15: Duplicate Detection Between Subscriptions and Line Items Fails

**What goes wrong:** Existing subscription duplicate detection (used during PDF import) doesn't consider new statement line items. User imports statement, gets Netflix subscription. Then imports PDF with same Netflix charge, gets duplicate subscription.

**Why it happens:** Two separate deduplication systems that don't talk to each other.

**Prevention:**
- Query both `subscriptions` AND `statement_line_items` when checking duplicates
- Unified deduplication service
```typescript
async function isDuplicateCharge(
  userId: string,
  merchant: string,
  amount: number,
  date: Date
): Promise<boolean> {
  // Check existing subscriptions
  const existingSub = await db.select()
    .from(subscriptions)
    .where(/* match logic */);

  // Check line items
  const existingLineItem = await db.select()
    .from(statementLineItems)
    .where(/* same match logic */);

  return existingSub.length > 0 || existingLineItem.length > 0;
}
```

**Detection:** Import PDF creating subscription, then import statement with same charge. Should be detected as duplicate.

**Severity:** MODERATE

---

## Sources

### Primary Sources (HIGH confidence)

**PDF Processing & Memory:**
- [Batch Processing Large Datasets in Node.js Without Running Out of Memory](https://dev.to/rabbitramang/batch-processing-large-datasets-in-nodejs-without-running-out-of-memory-9a1)
- [7 PDF Parsing Libraries for Extracting Data in Node.js](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025)
- [Know your limits: Node.js Memory Management (Part 1)](https://medium.com/@dev.abdullah.muhammed/know-your-limits-node-js-memory-management-part-1-v8-heap-gc-and-memory-leaks-5f9959e8221c)

**Database Performance & Pagination:**
- [How to Implement Keyset Pagination for Large Datasets](https://oneuptime.com/blog/post/2026-02-02-keyset-pagination/view)
- [Handling Large Datasets & High-Traffic Queries: Optimizing Pagination, Sorting & Filtering](https://medium.com/@jatin.jain_69313/handling-large-datasets-high-traffic-queries-optimizing-pagination-sorting-filtering-bf9a2d5a9813)
- [PostgreSQL Performance Tuning: Optimizing Database Indexes](https://www.tigerdata.com/learn/postgresql-performance-tuning-optimizing-database-indexes)

**Table Bloat & Cleanup:**
- [How to Reduce Bloat in Large PostgreSQL Tables](https://www.tigerdata.com/learn/how-to-reduce-bloat-in-large-postgresql-tables)
- [Massive Data Updates in PostgreSQL: How We Processed 80M Records with Minimal Impact](https://medium.com/@nikhil.srivastava944/massive-data-updates-in-postgresql-how-we-processed-80m-records-with-minimal-impact-20babd2cfe6f)
- [How to Prevent Table Bloat with Autovacuum Tuning in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-postgresql-autovacuum-tuning-prevent-table-bloat/view)

**Deduplication:**
- [Deduplication at Scale](https://www.moderntreasury.com/journal/deduplication-at-scale)
- [Understanding Fuzzy Data Deduplication](https://www.latentview.com/blog/understanding-fuzzy-data-deduplication/)
- [Data Deduplication Strategies: Reducing Storage and Improving Query Performance](https://talent500.com/blog/data-deduplication-strategies-reducing-storage-and-improving-query-performance/)

**Idempotency:**
- [Why Idempotency Matters in Payments](https://www.moderntreasury.com/journal/why-idempotency-matters-in-payments)
- [Idempotency's role in financial services](https://www.cockroachlabs.com/blog/idempotency-in-finance/)

**UI/UX Patterns:**
- [Infinite Scroll vs Pagination: Which Wins for SEO & UX?](https://www.designstudiouiux.com/blog/pagination-vs-infinite-scroll-seo-ux-comparison/)
- [UX: Infinite Scrolling vs. Pagination](https://uxplanet.org/ux-infinite-scrolling-vs-pagination-1030d29376f1)

### Secondary Sources (MEDIUM confidence)

**Batch Processing:**
- [Data batching in NodeJS](https://medium.com/@rusieshvili.joni/data-batching-in-nodejs-a38e92aee910)
- [n8n Batch Processing: Handle Large Datasets Without Crashing](https://logicworkflow.com/blog/n8n-batch-processing/)

**Data Integrity:**
- [Common Data Integrity Issues (and How to Overcome Them)](https://www.dataversity.net/articles/common-data-integrity-issues-and-how-to-overcome-them/)
- [Financial Data Integrity Issues: Risk Prevention Strategies](https://profisee.com/blog/data-integrity-issues/)

### Codebase Analysis (HIGH confidence)

- `src/lib/db/schema.ts` - Existing schema structure, import_audits table (lines 323-368)
- `.planning/phases/06-statement-source-tracking/06-RESEARCH.md` - Pattern for autocomplete, import flow
- `CLAUDE.md` - Tech stack (Next.js, Drizzle ORM, PostgreSQL/Supabase)

---

## Confidence Assessment

| Pitfall Category | Confidence | Rationale |
|------------------|------------|-----------|
| PDF Memory Issues | HIGH | Direct documentation from pdf-lib issues, Node.js memory management guides |
| Database Bloat | HIGH | PostgreSQL official docs + real-world case studies with 80M+ rows |
| Pagination Performance | HIGH | Multiple sources + PostgreSQL 17 keyset pagination blog |
| Deduplication | MEDIUM | Modern Treasury + LatentView sources, but specific fingerprinting needs testing |
| Integration Issues | MEDIUM | Based on codebase analysis, not verified in production |
| UI/UX Patterns | MEDIUM | Multiple UX sources agree, but financial app context may differ |

---

**Research completed:** 2026-02-08
**Recommended review:** When statement line items table exceeds 100K rows per user
