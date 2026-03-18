# Phase 49: Recurrence Detection & Auto-Linking - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement detection rules that find recurring patterns in normalized transactions, create recurring_series records, auto-link high-confidence series to recurring_masters, and populate the review queue for ambiguous matches. This phase produces the intelligence layer — it reads from Phase 48's normalized transactions and writes to Phase 47's recurring_series, recurring_masters, review_queue_items, and recurring_events tables.

This phase does NOT build APIs (Phase 50) or UI screens (Phase 51). It produces the detection engine that runs as part of the ingestion pipeline.

</domain>

<decisions>
## Implementation Decisions

### Detection architecture
- Create `src/lib/services/recurrence-detector.ts` as the main detection engine
- The detector operates on a user's transactions grouped by merchantEntityId (from Phase 48's merchant resolution)
- Detection runs AFTER the Phase 48 pipeline completes (after merchant resolution step)
- Sequential rule evaluation per merchant group: Rule A (alias hit) → Rule B (fixed monthly) → Rule C (variable monthly) → Rule D (annual) → Rule E (weekly/quarterly/custom)
- First matching rule wins — a merchant group gets one series per detected cadence
- Skip merchants with only 1 transaction (DETECT-10: single occurrences are not recurring candidates)
- Minimum 2 transactions required to detect any pattern

### Rule A — Known alias hit (DETECT-01)
- Check if the merchantEntityId is already linked to an existing recurring_master via recurring_master_series_links
- If yes: auto-create or extend a recurring_series for this merchant, link to the existing master
- Confidence: 0.95 (highest — explicit user-confirmed link via alias)
- This is the fast path for re-processing statements where masters already exist

### Rule B — Fixed monthly recurrence (DETECT-02)
- Same merchant, same amount (±5% tolerance), transactions roughly monthly (25-35 day intervals)
- Minimum 2 occurrences within the transaction set
- Day-of-month consistency check: standard deviation of day-of-month ≤ 5 days
- Amount type: fixed
- Confidence: 0.70 base + up to 0.20 bonus for consistency (more occurrences, tighter intervals, exact amounts)

### Rule C — Variable monthly recurrence (DETECT-03)
- Same merchant, varying amounts but within a band (coefficient of variation ≤ 0.5), monthly timing
- Minimum 2 occurrences
- Amount type: variable
- Confidence: 0.60 base + up to 0.15 bonus for consistency

### Rule D — Annual recurrence (DETECT-04)
- Same merchant, ~365 day interval (±30 days tolerance between occurrences)
- Minimum 2 occurrences (which implies ~2 years of data)
- Can be fixed or variable amount
- Confidence: 0.65 base (annual is harder to confirm with limited data)

### Rule E — Weekly/quarterly/custom (DETECT-05)
- Weekly: 5-9 day intervals, minimum 3 occurrences
- Quarterly: 80-100 day intervals, minimum 2 occurrences
- Custom: detect the most common interval if none of the standard cadences match
- Confidence: 0.55-0.70 depending on consistency

### Fixed vs variable classification (DETECT-06)
- If coefficient of variation of amounts ≤ 0.05: fixed
- If coefficient of variation > 0.05: variable
- Stored in recurring_series.amountType

### Next payment prediction (DETECT-07)
- Calculate average interval in days from detected cadence
- For monthly: use most common day-of-month + next month
- For annual: same day/month + next year
- For weekly: last date + 7 days
- Stored in recurring_series.nextExpectedDate (nullable timestamp)

### Series creation (DETECT-08)
- One recurring_series per detected pattern per merchant per user
- Series stores: merchantEntityId, detectedFrequency, intervalDays, dayOfMonth, avgAmount, minAmount, maxAmount, amountStddev, amountType, confidence, firstSeenDate, lastSeenDate, transactionCount, nextExpectedDate
- Junction table recurring_series_transactions links each transaction to its series with match_confidence

### Audit trail (DETECT-09)
- Write to recurring_events for: series_created, series_updated, master_created, master_linked, master_auto_linked, review_item_created
- Event metadata JSONB includes: rule used, confidence score, transaction count, amount range

### Auto-linking confidence thresholds (LINK-02, LINK-03, LINK-04)
- **≥ 0.85**: Auto-link — create or link to recurring_master automatically
- **0.60 - 0.84**: Review queue — create review_queue_item with suggested action
- **< 0.60**: Unmatched — series exists but no master link, no review item

### Linking match order (LINK-01)
- Step 1: Exact alias-to-master (Rule A already handles this)
- Step 2: Same merchantEntityId + compatible cadence + similar amount range → link to existing master
- Step 3: Fuzzy descriptor match + pattern similarity → suggest link (review queue)
- Step 4: No match → create new recurring_master if confidence ≥ 0.85
- Step 5: Ambiguous (multiple possible masters) → review queue with options

### Auto-link master creation
- When confidence ≥ 0.85 and no existing master matches: auto-create a new recurring_master
- Set recurring_kind based on heuristics: amount range + merchant category + frequency
  - Utilities: monthly, variable amounts, utility-category merchants
  - Subscriptions: monthly, fixed amounts, entertainment/software/media merchants
  - Insurance: monthly/annual, fixed amounts, insurance-category
  - Default: other_recurring
- Set status: active
- Set importance_rating: null (user fills in later)

### User decision override (LINK-05)
- User labels from user_transaction_labels take precedence over detection
- If user labeled a transaction "not_recurring": exclude it from detection
- If user labeled a transaction "recurring": boost confidence for that merchant's series
- Read user_transaction_labels before running detection for each merchant group

### Preserve existing links on reprocessing (LINK-06)
- When detection re-runs (re-processed statement), check if series already exist for this merchant+user
- If series exists: update stats (avgAmount, transactionCount, lastSeenDate) rather than creating duplicate
- If master link exists: preserve it, don't re-evaluate confidence
- Idempotent: running detection twice produces the same result

### Descriptor changes (LINK-07)
- Handled by Phase 48's merchant resolution — different descriptors map to same merchantEntityId via aliases
- Detection groups by merchantEntityId, so descriptor changes are transparent

### Amount changes (LINK-08)
- Amount change detected when new transaction amount differs from series avgAmount by > 10%
- Update series stats (new avg, new stddev)
- If master linked: create recurring_event with type "amount_changed" and old/new amounts
- If amount change is large (> 50%): add to review queue for user confirmation

### Account migration (LINK-09)
- Same merchantEntityId appearing on different financial accounts
- Detection runs per-user across all accounts — merchantEntityId grouping is account-agnostic
- If same merchant detected on multiple accounts: link all series to same master
- Create recurring_event with type "account_migration" noting old and new account

### Pipeline integration
- Detection runs as the final step in the batch/process pipeline, after merchant resolution
- Add a call to `detectAndLinkRecurrences(db, userId)` at the end of the pipeline
- The function processes ALL of the user's transactions (not just newly inserted ones) to build complete series
- This is computationally heavier but ensures accuracy — can be optimized later with incremental detection
- **DB pool constraint:** Use a single transaction for all series/master/event writes per merchant group to minimize connection usage

### Claude's Discretion
- Exact coefficient of variation thresholds for fixed vs variable
- How to handle edge cases like bi-monthly payments
- Whether to batch-create series or create one at a time
- Internal data structures for intermediate detection results
- How to order review queue items (by confidence, by amount, by date)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Recurrence Detection Engine (DETECT-01 to DETECT-10)
- `.planning/REQUIREMENTS.md` §Auto-Linking & Matching (LINK-01 to LINK-09)

### Prior phase decisions
- `.planning/phases/47-schema-domain-model/47-CONTEXT.md` — Schema: recurring_series, recurring_masters, recurring_events, review_queue_items table structures
- `.planning/phases/48-ingestion-merchant-resolution/48-CONTEXT.md` — Pipeline integration point, merchant resolution flow, transfer/refund handling

### Existing code (MUST READ)
- `src/lib/services/merchant-resolver.ts` — Merchant resolution service (Phase 48) — detection groups by merchantEntityId
- `src/app/api/batch/process/route.ts` — Pipeline endpoint where detection will be called
- `src/lib/db/schema.ts` — All tables including recurring_series, recurring_masters, recurring_events, review_queue_items, user_transaction_labels
- `src/lib/utils/merchant-normalization.ts` — Normalization function used to produce normalizedDescription

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resolveMerchant()` in `merchant-resolver.ts`: Returns merchantEntityId — detection groups transactions by this ID
- `normalizeMerchantDescriptor()`: Already normalizes descriptions — detection reads normalizedDescription column
- `isTransferOrRefund()`: Already filters transfers — detection can skip these transactions
- `generateSourceHash()`: Deduplication — detection reads only non-duplicate transactions
- DB schema tables: recurring_series, recurring_series_transactions, recurring_masters, recurring_master_series_links, review_queue_items, recurring_events, user_transaction_labels — all ready from Phase 47

### Established Patterns
- Services accept `db: DbClient` parameter for testability (see merchant-resolver.ts pattern)
- Drizzle ORM for all DB operations
- UUID PKs with `.defaultRandom()`
- `onConflictDoNothing()` / `onConflictDoUpdate()` for idempotent writes
- JSONB columns with `$type<T>()` for typed metadata

### Integration Points
- `src/app/api/batch/process/route.ts` — Add detection call after merchant resolution
- `recurring_series` table — Write detected series
- `recurring_masters` table — Write auto-created masters
- `recurring_events` table — Write audit trail events
- `review_queue_items` table — Write ambiguous matches for user review
- `user_transaction_labels` table — Read user decisions to influence detection

</code_context>

<specifics>
## Specific Ideas

- Detection runs on ALL user transactions, not just new ones — ensures complete series even from historical data
- Merchant resolution from Phase 48 makes descriptor changes transparent — detection never sees raw descriptors
- Confidence is multi-factor: base from rule type + bonus from consistency metrics (occurrence count, interval stddev, amount stddev)
- Review queue items include suggested_action JSONB with proposed recurring_kind, confidence breakdown, and sample transaction IDs for UI display
- The detection engine is the most computationally expensive part of v4.0 — but runs once per statement upload, not on every page load

</specifics>

<deferred>
## Deferred Ideas

- Incremental detection (process only new transactions instead of full user set) — performance optimization for future
- Machine learning-based detection (replace rule-based) — future enhancement
- Cross-user pattern sharing (if merchant X is recurring for 100 users, hint to new users) — requires global merchant entities
- Detection scheduling (run periodically vs only on upload) — future enhancement
- Detection confidence tuning UI — Phase 51 settings page

</deferred>

---

*Phase: 49-recurrence-detection-linking*
*Context gathered: 2026-03-18*
