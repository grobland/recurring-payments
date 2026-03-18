# Phase 50: APIs & Review Queue - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement all REST API endpoints for the recurring payment system: transaction labeling, recurring series management, recurring masters CRUD/merge/status, review queue resolution, and dashboard summary aggregation. Wire up actions that let users confirm, ignore, merge, and manage recurring payments through the API layer.

This phase does NOT build UI screens (Phase 51). It produces the API contract that the frontend will consume.

</domain>

<decisions>
## Implementation Decisions

### API route structure
- Create new route groups for recurring-specific entities under `/api/recurring/`
- Extend existing routes only where the change is minimal (e.g., adding a label endpoint to transactions)
- Follow established patterns: auth check → validation → try/catch → NextResponse.json

### Route mapping to requirements

**API-01: Accounts** — Already fully implemented at `/api/accounts` (GET, POST) and `/api/accounts/[id]` (GET, PUT, DELETE). No changes needed. Mark as satisfied by existing implementation.

**API-02: Statements** — Partially implemented. Existing routes:
- `/api/batch/upload` (POST) — upload already works
- `/api/batch/process` (POST /{id}/process) — processing already works
- `/api/statements/[id]` (GET) — detail already works
- `/api/statements/[id]/transactions` (GET) — transactions already works
- Missing: GET list endpoint for all user statements. **Decision:** Add GET handler to `/api/statements/route.ts` (new file) for listing statements with pagination and filters.

**API-03: Transactions** — Partially implemented. Existing:
- `/api/transactions` (GET) — list with filters
- `/api/transactions/[id]` (GET, PATCH, DELETE) — detail/update/delete
- Missing: POST /{id}/label endpoint. **Decision:** Create `/api/transactions/[id]/label/route.ts` — accepts `{ label: "recurring" | "not_recurring" | "ignore" }`, writes to `user_transaction_labels` table.

**API-04: Recurring Series** — New. Create:
- `/api/recurring/series/route.ts` — GET (list series with pagination, filter by status/confidence)
- `/api/recurring/series/[id]/route.ts` — GET (series detail with linked transactions)
- `/api/recurring/series/[id]/confirm/route.ts` — POST (confirm series as recurring, creates/links master if needed)
- `/api/recurring/series/[id]/ignore/route.ts` — POST (mark series as ignored, removes from active consideration)

**API-05: Recurring Masters** — New. Create:
- `/api/recurring/masters/route.ts` — GET (list masters with filters: kind, status, search), POST (create manual master)
- `/api/recurring/masters/[id]/route.ts` — GET (master detail with series chain, events), PATCH (update metadata)
- `/api/recurring/masters/[id]/merge/route.ts` — POST (merge two masters, reassign series links)
- `/api/recurring/masters/[id]/status/route.ts` — POST (change status: active, paused, cancelled, dormant)

**API-06: Review Queue** — New. Create:
- `/api/recurring/review-queue/route.ts` — GET (list pending review items with suggested actions)
- `/api/recurring/review-queue/[id]/resolve/route.ts` — POST (resolve item: confirm, link-to-existing, ignore, not-recurring)

**API-07: Dashboard Summary** — New. Create:
- `/api/recurring/dashboard/route.ts` — GET (aggregate: active recurring count, monthly total, upcoming payments, needs-review count, amount change warnings)

### Review queue resolution side effects
- When resolved as "confirm": create recurring_master + link series, log recurring_event, update review_queue_item status
- When resolved as "link-to-existing": link series to specified master, log recurring_event
- When resolved as "ignore": mark review_queue_item as resolved, no master/series changes
- When resolved as "not-recurring": create user_transaction_label for all transactions in the series, mark review_queue_item as resolved
- All resolution writes wrapped in db.transaction() per DB pool constraint
- Log to recurring_events with type "review_resolved" and metadata including resolution type

### Master merge logic
- POST /masters/{id}/merge with body `{ mergeIntoId: string }`
- Reassign all series links from source master to target master
- Preserve target master metadata (name, kind, status)
- Delete source master after reassignment
- Log recurring_event with type "master_merged" on both source and target
- All writes in single db.transaction()

### Dashboard summary aggregation
- Single query with aggregate functions — no N+1 queries
- Active recurring count: COUNT where status = 'active'
- Monthly total: SUM of expected amounts for active masters
- Upcoming payments: masters with nextExpectedDate within 7 days
- Needs review count: COUNT of unresolved review_queue_items
- Amount change warnings: recent recurring_events where type = 'amount_changed'
- Cache-friendly: response can be cached client-side for 60 seconds

### Response shapes
- Follow existing patterns: `NextResponse.json({ data })` for success
- Paginated lists: `{ data: [...], pagination: { total, page, pageSize, hasMore } }`
- Single entities: `{ data: { ...entity } }`
- Actions (confirm/ignore/resolve/merge/status): `{ success: true, ...resultDetails }`
- Errors: `{ error: "message" }` with appropriate HTTP status

### Auth and feature gating
- All endpoints require auth session (existing pattern)
- All queries scoped to session.user.id
- Feature gating: recurring endpoints require active subscription (primary tier minimum) — use existing `isUserActive()` check

### Claude's Discretion
- Exact pagination implementation (cursor vs offset — existing routes use cursor)
- Validation schemas (Zod) for request bodies
- Exact SQL query structure for dashboard aggregation
- How to handle deleted/cancelled masters in list responses (filter or include with status flag)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §APIs (API-01 to API-07)

### Existing API patterns (MUST READ for conventions)
- `src/app/api/transactions/route.ts` — Paginated list with filters, cursor pagination
- `src/app/api/transactions/[id]/route.ts` — Single entity CRUD
- `src/app/api/accounts/route.ts` — Simple CRUD pattern
- `src/app/api/batch/process/route.ts` — Complex pipeline with error handling

### Prior phase context
- `.planning/phases/47-schema-domain-model/47-CONTEXT.md` — Table structures for all new entities
- `.planning/phases/49-recurrence-detection-linking/49-CONTEXT.md` — How series/masters/events are created

### Schema
- `src/lib/db/schema.ts` — All tables including recurring_series, recurring_masters, review_queue_items, recurring_events, user_transaction_labels

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Auth pattern: `const session = await auth(); if (!session?.user?.id) return 401`
- Feature gate: `isUserActive(session.user)` from `src/lib/features/`
- Drizzle query patterns: `db.select().from(table).where(and(...)).orderBy(...).limit(...)`
- Cursor pagination: existing in transactions route — reuse pattern
- Zod validation: existing schemas in `src/lib/validations/`

### Established Patterns
- Route files export named functions: `export async function GET()`, `export async function POST()`
- Dynamic routes: `[id]` folder with `route.ts`
- Nested action routes: `/[id]/action/route.ts` (e.g., `/[id]/tags/route.ts`)
- Error responses: `{ error: string }` with appropriate status code
- User scoping: always filter by `eq(table.userId, session.user.id)`

### Integration Points
- `src/lib/services/recurrence-linker.ts` — linkDetectedSeries() for review queue resolution
- `src/lib/services/recurrence-detector.ts` — detectRecurringSeries() if re-detection needed
- `src/lib/db/schema.ts` — All table definitions and types
- `src/lib/auth/` — Auth configuration

</code_context>

<specifics>
## Specific Ideas

- API-01 (Accounts) is already complete — no new work needed, mark as satisfied
- Most of API-02 (Statements) is already complete — only needs a list endpoint
- Transaction label endpoint writes to user_transaction_labels (influences future detection per Phase 49's LINK-05)
- Review queue resolution is the most complex endpoint — wraps multiple DB writes in a transaction
- Dashboard summary should be a single efficient query, not multiple round-trips

</specifics>

<deferred>
## Deferred Ideas

- Webhook notifications for recurring payment events — future phase
- Bulk operations on recurring masters (batch pause/cancel) — future enhancement
- Export recurring data as CSV/JSON — could extend Phase 42's export system
- Rate limiting on API endpoints — production hardening phase

</deferred>

---

*Phase: 50-apis-review-queue*
*Context gathered: 2026-03-18*
