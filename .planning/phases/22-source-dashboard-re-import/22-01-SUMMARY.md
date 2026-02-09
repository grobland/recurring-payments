---
phase: 22
plan: 01
subsystem: api-data-layer
tags: [tanstack-query, aggregation, api, hooks]
completed: 2026-02-09
duration: 6m
requires:
  - Phase 19 (statements schema)
  - Phase 20 (transactions infrastructure)
provides:
  - Source coverage API endpoints
  - Statement drill-down API
  - TanStack Query hooks for source dashboard
affects:
  - 22-02 (uses hooks for UI components)
  - 22-03 (uses hooks for re-import flow)
tech-stack:
  added: []
  patterns:
    - SQL aggregation with groupBy for source stats
    - Gap detection using date-fns eachMonthOfInterval
    - URL-encoded dynamic route params
key-files:
  created:
    - src/types/source.ts
    - src/app/api/sources/route.ts
    - src/app/api/sources/[sourceType]/statements/route.ts
    - src/app/api/statements/[id]/transactions/route.ts
    - src/lib/hooks/use-sources.ts
    - src/lib/hooks/use-source-statements.ts
    - src/lib/hooks/use-statement-transactions.ts
  modified:
    - src/lib/hooks/index.ts
decisions:
  - key: sql-aggregation
    choice: Use SQL GROUP BY with CASE WHEN for status counts
    why: Avoids N+1 queries, efficient for aggregating transaction stats
  - key: gap-detection
    choice: date-fns eachMonthOfInterval for expected months
    why: Reliable interval generation, handles edge cases properly
  - key: url-encoding
    choice: decodeURIComponent for sourceType param
    why: Handles spaces and special characters in source names
metrics:
  tasks: 3
  commits: 3
  files-created: 7
  files-modified: 1
---

# Phase 22 Plan 01: Source Coverage API Summary

API layer for source coverage dashboard with aggregation endpoints and TanStack Query hooks

## What Was Built

### Types (src/types/source.ts)

Created TypeScript interfaces for source coverage data:

```typescript
export interface SourceCoverage {
  sourceType: string;
  earliestStatementDate: string;  // ISO date
  latestStatementDate: string;    // ISO date
  statementCount: number;
  transactionCount: number;
  lastImportDate: string;
  stats: { converted: number; skipped: number; pending: number };
  gaps: string[];  // YYYY-MM format
}

export interface StatementSummary {
  id: string;
  originalFilename: string;
  statementDate: string;
  uploadedAt: string;
  transactionCount: number;
  stats: { converted: number; skipped: number; pending: number };
}

export interface StatementTransaction {
  id: string;
  transactionDate: string;
  merchantName: string;
  amount: string;
  currency: string;
  tagStatus: string;
  convertedToSubscriptionId: string | null;
}
```

### API Endpoints

**GET /api/sources**
- Returns all statement sources with coverage statistics
- Uses SQL aggregation to calculate stats per source
- Implements gap detection for missing months
- Sorted by lastImportDate descending

**GET /api/sources/[sourceType]/statements**
- Returns all statements for a specific source type
- URL-decodes sourceType parameter
- Includes transaction count and status breakdown per statement
- Sorted by statementDate descending

**GET /api/statements/[id]/transactions**
- Returns all transactions for a specific statement
- Verifies user ownership before returning data
- Sorted by transactionDate descending

### TanStack Query Hooks

**useSources()**
- Query key: `sourceKeys.list()`
- Returns `SourceCoverage[]` with 2-minute cache

**useSourceStatements(sourceType)**
- Query key: `sourceStatementKeys.list(sourceType)`
- Enabled only when sourceType is provided
- Returns `StatementSummary[]`

**useStatementTransactions(statementId)**
- Query key: `statementTransactionKeys.list(statementId)`
- Enabled only when statementId is provided
- Returns `StatementTransaction[]`

## Key Implementation Details

### Gap Detection Algorithm

```typescript
function calculateGaps(dates: Date[]): string[] {
  // Generate all expected months in date range
  const allMonths = eachMonthOfInterval({ start: earliest, end: latest });
  const expectedMonths = new Set(allMonths.map(d => format(d, "yyyy-MM")));

  // Compare with actual months
  const actualMonths = new Set(sortedDates.map(d => format(d, "yyyy-MM")));

  // Return missing months
  return [...expectedMonths].filter(m => !actualMonths.has(m));
}
```

### SQL Aggregation Pattern

Used single query with GROUP BY and CASE WHEN for efficient status counting:

```typescript
const transactionStats = await db
  .select({
    sourceType: statements.sourceType,
    converted: sql`SUM(CASE WHEN tag_status = 'converted' THEN 1 ELSE 0 END)::int`,
    skipped: sql`SUM(CASE WHEN tag_status = 'not_subscription' THEN 1 ELSE 0 END)::int`,
    pending: sql`SUM(CASE WHEN tag_status IN ('unreviewed', 'potential_subscription') THEN 1 ELSE 0 END)::int`,
  })
  .from(transactions)
  .innerJoin(statements, eq(transactions.statementId, statements.id))
  .groupBy(statements.sourceType);
```

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

- Build completes successfully
- TypeScript compilation passes
- Hooks exported from index.ts for convenient imports

## Next Phase Readiness

Ready for 22-02 (Source Dashboard UI Components) which will:
- Use useSources() for the source list view
- Use useSourceStatements() for statement drill-down
- Use useStatementTransactions() for transaction details

## Commits

| Hash | Message |
|------|---------|
| 7dac13e | feat(22-01): add source coverage types and API endpoint |
| 3dc8072 | feat(22-01): add statement and transaction detail APIs |
| 7e67641 | feat(22-01): add TanStack Query hooks for source coverage |
