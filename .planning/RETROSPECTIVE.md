# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v3.0 — Navigation & Account Vault

**Shipped:** 2026-02-27
**Phases:** 6 | **Plans:** 12

### What Was Built
- Restructured entire navigation into 3 sections (fin Vault, payments Portal, Support)
- Financial account management with type-specific CRUD (Bank/Debit, Credit Card, Loan)
- Account detail pages with 4 tabs (Details, Coverage, Transactions, Spending)
- Payment type selector with nuqs URL persistence and recurring/one-time classification
- Data Schema viewer (21-table card grid) and Help FAQ (6-category accordion)
- 308 permanent redirects for all moved URLs

### What Worked
- Phase-level isolation: each phase had clear boundaries and minimal cross-phase coupling
- Verbatim copy strategy for route migration (Phase 36) minimized diff surface and bugs
- Financial_accounts naming collision caught early (NextAuth owns `accounts` table)
- Migration SQL review guard for Drizzle FK bug #4147 prevented data corruption
- Self-contained AccountTransactionsTab pattern — avoided breaking global TransactionBrowser
- Audit-first approach: running `/gsd:audit-milestone` before Phase 40 caught SCHEMA-01 and HELP-01 gaps

### What Was Inefficient
- Phase 40 audit showed gaps_found because it was run before Phase 40 started — audit timing could be improved
- SUMMARY.md frontmatter inconsistency (some missing one_liner, requirements_completed fields) — makes automated extraction unreliable
- Phase 38 SUMMARY frontmatter had empty requirements_completed arrays — documentation gap only
- Old route files not cleaned up during migration — kept for 308 redirect compatibility but adds confusion

### Patterns Established
- `isNavItemActive` exact-match default with explicit prefix-match exceptions for routes with real children
- nuqs for URL-persisted filter state (shallow updates, no scroll reset)
- filterControls() helper pattern for rendering shared controls across loading/error/empty/main branches
- Account-scoped API endpoints using accountId FK join (not linkedSourceType string matching)
- Hardcoded static data for schema/help pages (no live DB introspection)

### Key Lessons
1. Name collisions in shared ORM schemas are hard constraints — check existing table names before naming new entities
2. Self-contained tab components beat modifying shared components when account-scoping is needed
3. Raw SQL subqueries are sometimes necessary when ORM doesn't support cross-table operations cleanly
4. Audit before the last phase creates false gaps — consider auditing after all phases are planned/complete
5. One new npm package per milestone (nuqs) is a good constraint signal — keeps dependencies lean

### Cost Observations
- Model mix: balanced profile throughout
- 71 commits across 6 days
- Notable: 119 files changed with only 288 deletions — mostly additive work

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 4 | 7 | Service configuration + verification pattern |
| v1.1 | 4 | 11 | Category management + smart import UX |
| v1.2 | 4 | 10 | Production polish + error handling |
| v1.3 | 6 | 21 | Analytics + pattern detection (largest phase count) |
| v2.0 | 5 | 21 | Statement hub + virtualized browser |
| v2.1 | 7 | 19 | Billing + feature gating (most phases) |
| v2.2 | 4 | 9 | Financial data vault + PDF storage |
| v3.0 | 6 | 12 | Navigation restructure + account management |

### Cumulative Stats

| Milestone | Plans Total | Requirements | LOC (approx) |
|-----------|-----------|--------------|--------------|
| v1.0 | 7 | 9 | ~15,000 |
| v1.1 | 18 | 27 | ~17,700 |
| v1.2 | 28 | 46 | ~18,800 |
| v1.3 | 49 | 69 | ~27,350 |
| v2.0 | 70 | 96 | ~36,050 |
| v2.1 | 89 | 110 | ~42,000 |
| v2.2 | 98 | 120 | ~48,000 |
| v3.0 | 110 | 152 | ~47,800 |

### Top Lessons (Verified Across Milestones)

1. Sequential processing prevents memory exhaustion (PDF processing v2.0, maintained through v3.0)
2. Keyset pagination scales better than OFFSET (v2.0, reused in v3.0 account transactions)
3. Self-contained components beat shared-state modification (v2.0 TransactionBrowser, v3.0 AccountTransactionsTab)
4. Static data for reference pages beats live DB introspection (v3.0 schema viewer — security + simplicity)
5. Audit-driven gap closure works (v2.1 Phases 29-30, v3.0 Phase 40 after audit)
