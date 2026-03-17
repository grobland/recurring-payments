# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## coverage-grid-all-gray — Coverage grid shows all cells gray after PDF upload
- **Date:** 2026-03-17
- **Error patterns:** coverage grid, gray, missing, statementDate, NULL, cellMap empty, vault coverage
- **Root cause:** statementDate was never set on INSERT (upload route) or UPDATE (process route). The coverage route's DB query filtered by statementDate range (excluding NULL rows), and the loop explicitly skipped NULL statementDate rows — so cellMap was always empty and every cell rendered as "missing".
- **Fix:** (1) upload/route.ts already reads statementDate from form param + filename fallback and includes it in INSERT. (2) process/route.ts already derives statementDate from earliest transaction date + filename fallback and includes it in UPDATE. (3) coverage/route.ts DB query changed to include NULL statementDate rows via `or(and(gte,lte), isNull)`; loop falls back to processedAt then createdAt for month bucketing instead of skipping NULL rows.
- **Files changed:** src/app/api/vault/coverage/route.ts
---
