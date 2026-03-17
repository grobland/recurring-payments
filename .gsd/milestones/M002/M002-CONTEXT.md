# M002: Immutable Ledger — Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

## Project Description

Subscription Manager — a web application for tracking recurring subscriptions. Users upload bank statement PDFs which are processed by AI to extract transactions. Currently, the AI only extracts items it identifies as potential subscriptions. The rest of the statement data is discarded.

## Why This Milestone

The current extraction pipeline throws away the majority of statement data. A bank statement might have 40–80 line items; the AI picks out 3–5 that look like subscriptions. The user has no electronic record of what was actually on the PDF — they must open the PDF viewer to see the original.

This milestone creates a **read-only electronic ledger** that faithfully stores every line item from every uploaded document, normalized into common schemas per document type (bank statement, credit card statement, loan statement). This ledger is the single source of truth for "what was on the PDF" and must be immutable after extraction — no user edits, no AI corrections. If a re-extraction is needed, old records are replaced wholesale.

This unlocks: full-text search across all statement data, queryable financial history, CSV export of complete statements, accurate balance tracking, and richer subscription detection (the AI can analyze all line items, not just the ones it thinks are subscriptions).

## User-Visible Outcome

### When this milestone is complete, the user can:

- Upload a bank statement PDF and see every line item stored electronically, not just subscriptions
- Upload a credit card statement PDF and see every transaction including purchases, payments, fees, and interest
- Upload a loan statement PDF and see payment breakdowns (principal, interest, fees, balance)
- Browse all extracted line items for any statement in a read-only viewer
- See line items appear correctly regardless of which bank/card issuer the statement comes from
- Query and export the complete electronic data from their statements
- Still have subscription detection working on top of the full extraction (existing flow preserved)

### Entry point / environment

- Entry point: http://localhost:3000/vault/load (upload), account detail pages (browse)
- Environment: local dev / browser
- Live dependencies involved: Supabase PostgreSQL, OpenAI GPT-4o API

## Completion Class

- Contract complete means: unit tests prove extraction schemas produce correct normalized output for sample statements, DB migration applied, immutability enforced at API level
- Integration complete means: real PDFs uploaded → full line items extracted → stored in DB → visible in read-only UI → subscription detection still works
- Operational complete means: existing statements can be re-processed to backfill line items (optional, deferred if risky)

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A bank statement PDF uploaded via /vault/load produces a complete set of line items in the ledger matching what's visible on the PDF
- A credit card statement PDF uploaded produces line items with credit-card-specific fields (posting date, merchant, foreign currency)
- The line items are read-only — no API endpoint permits modification
- The existing subscription detection pipeline still works (transactions table still populated)
- Line items are browsable in the UI with the correct fields displayed per document type

## Risks and Unknowns

- **AI extraction quality for full line items** — GPT-4o has only been prompted for subscriptions; full extraction of every line item with normalized fields is a different (harder) task. Field mapping accuracy across different bank formats is uncertain.
- **Schema design for varying document types** — Bank statements, credit card statements, and loan statements have different field sets. The common+typed-JSONB approach needs careful design to be queryable without being unwieldy.
- **Volume** — Full extraction means 10–50x more rows per statement. Query performance and storage costs increase proportionally.
- **Backward compatibility** — Existing transactions table and subscription detection must keep working. The new ledger is additive, not a replacement.
- **Re-extraction of existing statements** — Users have already uploaded statements that were only partially extracted. Backfilling is valuable but risky (re-processing costs OpenAI credits, might produce different results).

## Existing Codebase / Prior Art

- `src/lib/db/schema.ts` — Current schema: `statements` (PDF metadata), `transactions` (AI-detected subscription candidates), `financialAccounts` (with accountType enum: bank_debit, credit_card, loan)
- `src/lib/openai/pdf-parser.ts` — Current AI extraction: `parseTextForSubscriptions()` with subscription-focused system prompt
- `src/app/api/batch/process/route.ts` — Processing pipeline: PDF → text extraction → AI parse → insert transactions
- `src/app/api/batch/upload/route.ts` — Upload pipeline: file receipt → hash check → statement record → PDF storage
- `src/components/vault/coverage-grid.tsx` — Coverage visualization (will show line item counts)
- `src/components/transactions/transaction-browser.tsx` — Existing transaction browser (for the working/annotatable view)

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- LEDGER-01 through LEDGER-12 — See requirements file for full list

## Scope

### In Scope

- New `statement_line_items` table with common fields + JSONB details column
- Three AI extraction prompts (bank_debit, credit_card, loan) that extract ALL line items
- Normalized field mapping per document type
- Read-only API endpoints for line item data
- Line item viewer UI (per-statement, per-account)
- Integration with existing subscription detection (AI still flags potential subscriptions)
- Updated batch process pipeline to populate both line_items and transactions
- Line item count in coverage grid and statement metadata

### Out of Scope / Non-Goals

- User editing of line items (immutable by design)
- Automatic re-extraction of previously uploaded statements (manual trigger only, if at all)
- OCR or non-PDF document support
- Bank API integration (Plaid/MX)
- Balance reconciliation across statements
- Custom field mapping UI (system defines the schemas)

## Technical Constraints

- PostgreSQL via Supabase (Drizzle ORM, migrations via db:generate + db:migrate)
- OpenAI GPT-4o for extraction (pay-per-use, ~$0.01–0.03 per statement page)
- JSONB for type-specific fields (queryable via Postgres JSON operators but not type-checked at DB level)
- Immutability enforced at application layer (no UPDATE/PATCH endpoints), not DB-level constraints

## Integration Points

- **OpenAI GPT-4o** — New system prompts per document type; response schema changes
- **Supabase PostgreSQL** — New table, new migration, increased row volume
- **Batch process pipeline** — Must populate both statement_line_items and transactions
- **Transaction browser** — Existing browser continues to work on transactions table
- **Coverage grid** — Line item counts replace transaction counts in metadata
- **Account detail pages** — Line item viewer added as new tab or section

## Open Questions

- **Should line items have their own deduplication?** — Currently transactions use a fingerprint hash. Line items could use a similar approach (statement_id + line_number or statement_id + date + amount + description hash). Leaning toward statement_id + sequence_number (position in the PDF).
- **Should the AI extraction for subscriptions be a second pass or derived from line items?** — Option A: extract all line items first, then run subscription detection as a second AI call on the line items. Option B: extract all line items AND flag subscriptions in a single prompt. Option B is cheaper but might reduce quality. Leaning toward Option A (two-pass) for cleaner separation.
- **What happens when the AI misses a line item?** — The ledger won't match the PDF perfectly. This is acceptable for v1 — the PDF is always available as ground truth. A "re-extract" button could be added later.
