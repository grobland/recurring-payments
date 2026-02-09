# Phase 20: Statement Browser & Filtering - Research

**Researched:** 2026-02-09
**Domain:** Virtualized data tables with cursor pagination and responsive design
**Confidence:** HIGH

## Summary

This phase implements a transaction browser that displays 10k+ items with virtualized scrolling at 60fps. The research confirms TanStack Virtual v3 as the standard library for virtualization in React, with keyset (cursor-based) pagination implemented via Drizzle ORM for consistent performance at any depth in the dataset.

The existing codebase already uses TanStack Query for data fetching, shadcn/ui components (Table, Card, Badge, Skeleton), and has a `useIsMobile` hook for responsive design. The transactions table schema is in place with appropriate indexes on `userId`, `transactionDate`, `tagStatus`, and `fingerprint`.

**Primary recommendation:** Use TanStack Virtual's `useVirtualizer` hook with keyset pagination via `useInfiniteQuery`, debouncing search input at the state level (not queryFn), and CSS media queries to switch between table and card layouts.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-virtual | 3.x | Row virtualization | Official TanStack solution, 10-15kb, headless, 60fps with 10k+ rows |
| @tanstack/react-query | 5.x (existing) | Data fetching with cursor pagination | Already in codebase, `useInfiniteQuery` supports cursor-based fetching |
| drizzle-orm | 0.45.x (existing) | Cursor-based database queries | Already in codebase, official cursor pagination guide available |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.x (existing) | Date formatting in filters | Date range picker display |
| react-day-picker | 9.x (existing) | Date range selection | Date filter component |
| zod | 4.x (existing) | Filter validation | Validate query parameters |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tanstack/react-virtual | react-window | react-window is older, less maintained, TanStack Virtual is the successor |
| @tanstack/react-virtual | react-virtuoso | More features but heavier, TanStack Virtual is lighter and composable |
| Custom debounce | TanStack Pacer | Pacer is new (2026), custom hook is simpler for single use case |

**Installation:**
```bash
npm install @tanstack/react-virtual
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/transactions/
│   └── route.ts                    # GET with cursor pagination
├── components/transactions/
│   ├── transaction-browser.tsx     # Main browser component
│   ├── transaction-table.tsx       # Desktop virtualized table
│   ├── transaction-card-list.tsx   # Mobile card layout
│   ├── transaction-row.tsx         # Single table row
│   ├── transaction-card.tsx        # Single mobile card
│   ├── transaction-filters.tsx     # Filter bar component
│   └── tag-status-badge.tsx        # Colored status badge
└── lib/hooks/
    ├── use-transactions.ts         # useInfiniteQuery hook
    └── use-debounced-value.ts      # Debounce for search
```

### Pattern 1: Virtualized Table with TanStack Virtual
**What:** Render only visible rows plus overscan buffer, use absolute positioning
**When to use:** Desktop view with 10k+ rows
**Example:**
```typescript
// Source: https://tanstack.com/virtual/latest/docs/framework/react/examples/table
import { useVirtualizer } from '@tanstack/react-virtual'

const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48, // row height in pixels
  overscan: 20, // render 20 extra rows for smooth scrolling
})

// Container needs fixed height and overflow-auto
<div ref={parentRef} className="h-[600px] overflow-auto">
  <table>
    <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index]
        return (
          <tr
            key={row.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {/* cells */}
          </tr>
        )
      })}
    </tbody>
  </table>
</div>
```

### Pattern 2: Keyset Pagination with Drizzle
**What:** Use cursor (last item's sort key) instead of OFFSET for consistent, fast pagination
**When to use:** Any paginated list that may have insertions/deletions
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/guides/cursor-based-pagination
import { and, gt, lt, eq, desc, asc } from 'drizzle-orm'

interface TransactionCursor {
  transactionDate: string // ISO date string
  id: string // UUID for tiebreaker
}

async function fetchTransactions(
  userId: string,
  cursor?: TransactionCursor,
  pageSize = 50,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const compare = sortOrder === 'desc' ? lt : gt

  return db
    .select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      cursor
        ? or(
            compare(transactions.transactionDate, cursor.transactionDate),
            and(
              eq(transactions.transactionDate, cursor.transactionDate),
              compare(transactions.id, cursor.id)
            )
          )
        : undefined
    ))
    .orderBy(
      sortOrder === 'desc'
        ? desc(transactions.transactionDate)
        : asc(transactions.transactionDate),
      sortOrder === 'desc'
        ? desc(transactions.id)
        : asc(transactions.id)
    )
    .limit(pageSize)
}
```

### Pattern 3: Debounced Search with Query Key
**What:** Debounce the state value that feeds the query key, not the fetch function
**When to use:** Instant search that fires queries on every keystroke
**Example:**
```typescript
// Source: https://github.com/TanStack/query/discussions/3132
function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// Usage in component
const [searchInput, setSearchInput] = useState('')
const debouncedSearch = useDebouncedValue(searchInput, 300)

// Query only fires when debouncedSearch changes
const { data } = useInfiniteQuery({
  queryKey: ['transactions', { search: debouncedSearch, ...filters }],
  queryFn: ({ pageParam }) => fetchTransactions({ cursor: pageParam, search: debouncedSearch }),
  // ...
})
```

### Pattern 4: Responsive Table-to-Cards
**What:** Use CSS media queries and conditional rendering to show table on desktop, cards on mobile
**When to use:** Data grids that need mobile support
**Example:**
```typescript
// Use existing useIsMobile hook
import { useIsMobile } from '@/hooks/use-mobile'

export function TransactionBrowser() {
  const isMobile = useIsMobile()

  return isMobile
    ? <TransactionCardList transactions={data} />
    : <TransactionTable transactions={data} />
}
```

### Anti-Patterns to Avoid
- **OFFSET pagination for large datasets:** Performance degrades linearly with page depth. Use keyset pagination instead.
- **Debouncing queryFn:** Creates separate cache entries for intermediate states. Debounce the query key state instead.
- **Rendering all rows:** DOM becomes unresponsive with 1000+ rows. Always virtualize large lists.
- **Horizontal scroll on mobile tables:** Poor UX. Convert to card/stack layout.
- **Re-rendering entire list on filter change:** Let TanStack Query handle cache invalidation. Keep filter state in URL or local state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Row virtualization | Custom windowing logic | @tanstack/react-virtual | Edge cases: variable height, scroll restoration, overscan, resize |
| Infinite scroll pagination | Manual page tracking | useInfiniteQuery | Handles loading states, error boundaries, cache deduplication |
| Debounce function | setTimeout wrapper | useDebouncedValue hook | Cleanup, memory leaks, stale closures |
| Mobile detection | window.innerWidth check | useIsMobile (existing) | SSR safety, resize listener cleanup |
| Date range picker | Custom calendar | react-day-picker (existing) | Accessibility, i18n, edge cases |

**Key insight:** Virtualization looks simple ("just render what's visible") but has dozens of edge cases: dynamic sizing, scroll position restoration, keyboard navigation, screen reader support, and resize handling.

## Common Pitfalls

### Pitfall 1: Forgetting Container Height for Virtualization
**What goes wrong:** Virtualizer calculates visible items based on container height. If container has no fixed height, all items render.
**Why it happens:** Parent container uses auto height instead of fixed/percentage height
**How to avoid:** Always set explicit height on scroll container (`h-[600px]` or `calc(100vh - Xpx)`)
**Warning signs:** All rows render at once, performance is poor, scrollbar indicates full list

### Pitfall 2: Cursor Pagination with Non-Unique Sort Column
**What goes wrong:** Duplicate cursors cause skipped or duplicated items
**Why it happens:** Using only transactionDate as cursor, but multiple transactions can have same date
**How to avoid:** Always include a unique tiebreaker column (id) in cursor and ORDER BY
**Warning signs:** Items appear twice or go missing when paginating

### Pitfall 3: Stale Closures in Debounce
**What goes wrong:** Debounced function uses old state values
**Why it happens:** Closure captures initial state, not current
**How to avoid:** Use useEffect with cleanup, or React 18's useDeferredValue
**Warning signs:** Search results don't match input, results lag behind

### Pitfall 4: Mobile Cards Missing Key Data
**What goes wrong:** Card layout omits columns visible in table, users can't find info
**Why it happens:** Trying to fit all data in small space, cutting corners
**How to avoid:** Design card layout to show all essential fields: date, merchant, amount, source, tag status
**Warning signs:** Users switch to desktop view, support requests about "missing" data

### Pitfall 5: Filter State Not in URL
**What goes wrong:** Refreshing page or sharing link loses filter state
**Why it happens:** Storing filters only in React state
**How to avoid:** Sync filters to URL search params with Next.js useSearchParams
**Warning signs:** Users complain about losing their filtered view

## Code Examples

### useInfiniteQuery with Cursor Pagination
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries
import { useInfiniteQuery } from '@tanstack/react-query'

interface TransactionFilters {
  sourceType?: string
  tagStatus?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

interface TransactionPage {
  transactions: Transaction[]
  nextCursor: { transactionDate: string; id: string } | null
  hasMore: boolean
}

export function useTransactions(filters: TransactionFilters) {
  return useInfiniteQuery<TransactionPage>({
    queryKey: ['transactions', filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (filters.sourceType) params.set('sourceType', filters.sourceType)
      if (filters.tagStatus) params.set('tagStatus', filters.tagStatus)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.search) params.set('search', filters.search)
      if (pageParam) {
        params.set('cursorDate', pageParam.transactionDate)
        params.set('cursorId', pageParam.id)
      }

      const res = await fetch(`/api/transactions?${params}`)
      if (!res.ok) throw new Error('Failed to fetch transactions')
      return res.json()
    },
    initialPageParam: null as TransactionPage['nextCursor'],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}
```

### API Route with Keyset Pagination
```typescript
// Source: https://orm.drizzle.team/docs/guides/cursor-based-pagination
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { transactions } from '@/lib/db/schema'
import { and, eq, or, lt, ilike, desc } from 'drizzle-orm'

const PAGE_SIZE = 50

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cursorDate = searchParams.get('cursorDate')
  const cursorId = searchParams.get('cursorId')
  const sourceType = searchParams.get('sourceType')
  const tagStatus = searchParams.get('tagStatus')
  const search = searchParams.get('search')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const conditions = [eq(transactions.userId, session.user.id)]

  // Apply filters
  if (sourceType) {
    // Join with statements to filter by sourceType
  }
  if (tagStatus && tagStatus !== 'all') {
    conditions.push(eq(transactions.tagStatus, tagStatus))
  }
  if (search) {
    conditions.push(or(
      ilike(transactions.merchantName, `%${search}%`),
      ilike(transactions.categoryGuess, `%${search}%`)
    ))
  }
  if (dateFrom) {
    conditions.push(gte(transactions.transactionDate, new Date(dateFrom)))
  }
  if (dateTo) {
    conditions.push(lte(transactions.transactionDate, new Date(dateTo)))
  }

  // Apply cursor
  if (cursorDate && cursorId) {
    conditions.push(or(
      lt(transactions.transactionDate, new Date(cursorDate)),
      and(
        eq(transactions.transactionDate, new Date(cursorDate)),
        lt(transactions.id, cursorId)
      )
    ))
  }

  const results = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.transactionDate), desc(transactions.id))
    .limit(PAGE_SIZE + 1) // Fetch one extra to check if more exist

  const hasMore = results.length > PAGE_SIZE
  const page = hasMore ? results.slice(0, PAGE_SIZE) : results
  const lastItem = page[page.length - 1]

  return NextResponse.json({
    transactions: page,
    nextCursor: hasMore && lastItem ? {
      transactionDate: lastItem.transactionDate.toISOString(),
      id: lastItem.id,
    } : null,
    hasMore,
  })
}
```

### Tag Status Badge Component
```typescript
// Use existing Badge component with custom variants
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type TagStatus = 'unreviewed' | 'potential_subscription' | 'not_subscription' | 'converted'

const tagStatusConfig: Record<TagStatus, { label: string; className: string }> = {
  unreviewed: { label: '', className: '' }, // No badge shown
  potential_subscription: {
    label: 'Potential',
    className: 'bg-blue-500 text-white hover:bg-blue-600'
  },
  converted: {
    label: 'Converted',
    className: 'bg-green-500 text-white hover:bg-green-600'
  },
  not_subscription: {
    label: 'Dismissed',
    className: 'bg-gray-400 text-white hover:bg-gray-500'
  },
}

export function TagStatusBadge({ status }: { status: TagStatus }) {
  if (status === 'unreviewed') return null

  const config = tagStatusConfig[status]
  return (
    <Badge className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-virtualized | @tanstack/react-virtual | 2022 | Lighter, headless, framework-agnostic |
| OFFSET pagination | Keyset/cursor pagination | Always recommended | O(1) vs O(n) for deep pages |
| debounce(queryFn) | debounce(queryKey state) | TanStack Query v4+ | Correct cache behavior |
| Single scroll event | IntersectionObserver | 2020+ | Better performance, less jank |

**Deprecated/outdated:**
- react-window: Still works but react-virtual is recommended by TanStack
- OFFSET with LIMIT: Still common but avoid for user-facing pagination of large datasets

## Open Questions

1. **Filter persistence strategy**
   - What we know: Filters should survive page refresh
   - What's unclear: Use URL search params vs localStorage vs both?
   - Recommendation: Use URL search params for shareability, sync with useSearchParams

2. **Virtualization row height**
   - What we know: estimateSize needs a pixel value
   - What's unclear: Exact row height depends on final design
   - Recommendation: Start with 48px, measure actual rendered row, adjust

## Sources

### Primary (HIGH confidence)
- [TanStack Virtual Docs](https://tanstack.com/virtual/latest) - Version info, API, examples
- [TanStack Virtual Table Example](https://tanstack.com/virtual/latest/docs/framework/react/examples/table) - Row virtualization pattern
- [Drizzle ORM Cursor-Based Pagination](https://orm.drizzle.team/docs/guides/cursor-based-pagination) - Keyset pagination implementation
- [TanStack Query Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries) - useInfiniteQuery API

### Secondary (MEDIUM confidence)
- [TanStack Query Debounce Discussion](https://github.com/TanStack/query/discussions/3132) - Debounce pattern recommendation
- [Building Performant Virtualized Table](https://medium.com/codex/building-a-performant-virtualized-table-with-tanstack-react-table-and-tanstack-react-virtual-f267d84fbca7) - Integration patterns

### Tertiary (LOW confidence)
- TanStack Pacer for debouncing - New library, may be overkill for single use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official TanStack documentation verified
- Architecture: HIGH - Patterns from official docs and existing codebase
- Pitfalls: HIGH - Documented in TanStack discussions and guides

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable libraries)
