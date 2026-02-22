# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Users can see all their subscriptions in one place and never get surprised by a renewal again
**Current focus:** v3.0 Navigation & Account Vault — Phase 35 Plan 01 complete

## Current Position

Phase: 35 of 40 (Database Foundation)
Plan: 1 of 2 complete
Status: In progress
Last activity: 2026-02-22 — Phase 35 Plan 01 complete (schema.ts + backfill rename)

Progress: [█░░░░░░░░░] 5% (v3.0 Phase 35 Plan 01 done)

## Archived Milestones

| Version | Name | Shipped | Phases | Plans | Requirements |
|---------|------|---------|--------|-------|--------------|
| v2.2 | Financial Data Vault | 2026-02-21 | 31-34 | 9 | 10/10 |
| v2.1 | Billing & Monetization | 2026-02-18 | 24-30 | 19 | 14/14 |
| v2.0 | Statement Hub | 2026-02-10 | 19-23 | 21 | 27/27 |
| v1.3 | Data & Intelligence | 2026-02-08 | 13-18 | 21 | 23/23 |
| v1.2 | Production Polish | 2026-02-05 | 9-12 | 10 | 19/19 |
| v1.1 | Import Improvements | 2026-02-02 | 5-8 | 11 | 18/18 |
| v1.0 | Get It Running | 2026-01-30 | 1-4 | 7 | 9/9 |

**Total:** 99 plans completed, 131 requirements validated across 7 milestones (+ 6 ACCT requirements in progress)

## Performance Metrics

**Velocity:**
- Total plans completed: 99
- Total phases: 34 complete, 6 planned (v3.0, Phase 35 in progress)
- Total milestones: 7 complete, 1 in progress

## Accumulated Context

### Decisions

Recent decisions affecting v3.0 work:
- financial_accounts (not accounts) — NextAuth owns the accounts table at schema.ts line 120; naming collision is a hard constraint
- Nullable accountId FK on statements — all existing statements predate accounts; NOT NULL would cause migration failure
- User-driven source-to-account migration — no automatic backfill; user creates accounts and links sources via UI
- Read generated SQL before db:migrate — Drizzle bug #4147: FK + column in same migration can generate incorrect SQL
- nuqs@^2.8.8 — only new npm package for entire v3.0 milestone; needed for URL-persisted filter state without scroll reset

### Blockers/Concerns

**Phase 35 (Database Foundation):**
- Always read generated .sql file before running db:migrate (Drizzle FK bug #4147)
- Decide CHECK constraint approach before generating migration: nullable-only (simpler) vs nullable + PostgreSQL CHECK (safer)

**Phase 37 (Account CRUD):**
- Run grep -r sourceType src/ and audit all 37 consumers before writing migration logic
- PATCH /api/accounts/[id] must invalidate five query keys: ["accounts"], ["vault","coverage"], ["vault","timeline"], ["sources"], ["transactions"]

**Production deployment (carried forward):**
- RESEND_FROM_EMAIL needs verified domain for email delivery
- NEXT_PUBLIC_SENTRY_DSN needed for Sentry error tracking
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY required for storage

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 35-01-PLAN.md (schema.ts edits + backfill rename)
Resume with: `/gsd:execute-phase 35` (Plan 02 — db:generate + db:migrate)
