# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Users can see all their subscriptions in one place and never get surprised by a renewal again
**Current focus:** v3.0 Account Vault CRUD — Phase 37 in progress (Plan 02 of 3 complete)

## Current Position

Phase: 37 of 40 (Account CRUD List Page) — IN PROGRESS
Plan: 2 of 3 complete
Status: Phase 37 Plan 02 complete — account UI components (form, card, list, delete dialog), accounts page, batch upload ACCT-08
Last activity: 2026-02-26 — Phase 37 Plan 02 complete (AccountForm, AccountCard, AccountList, AccountDeleteDialog, ACCT-08 auto-assign)

Progress: [██████░░░░] 27% (v3.0 Phase 37 Plan 02 complete — 2/3 plans)

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

**Total:** 105 plans completed, 142 requirements validated across 7 milestones (+ 8 ACCT requirements complete in Phase 35, + NAV-01, NAV-02, NAV-03 in Phase 36, + ACCT-01 through ACCT-08 complete in Phase 37)

## Performance Metrics

**Velocity:**
- Total plans completed: 105
- Total phases: 36 complete, 4 planned (v3.0, Phase 37 in progress)
- Total milestones: 7 complete, 1 in progress

## Accumulated Context

### Decisions

Recent decisions affecting v3.0 work:
- financial_accounts (not accounts) — NextAuth owns the accounts table at schema.ts line 120; naming collision is a hard constraint
- Nullable accountId FK on statements — all existing statements predate accounts; NOT NULL would cause migration failure
- User-driven source-to-account migration — no automatic backfill; user creates accounts and links sources via UI
- Read generated SQL before db:migrate — Drizzle bug #4147: FK + column in same migration can generate incorrect SQL
- nuqs@^2.8.8 — only new npm package for entire v3.0 milestone; needed for URL-persisted filter state without scroll reset
- DROP INDEX IF EXISTS / CREATE INDEX IF NOT EXISTS guards in migrations — protects against index drift between local migration files and actual DB state (prior db:push usage)
- Manual drizzle.__drizzle_migrations seeding strategy — when journal is empty but DB has tables, compute SHA256(sql_content) per migration and INSERT with journal.when as created_at
- isNavItemActive uses exact match by default, prefix match only for /payments/subscriptions and /settings (routes with real children) — prevents /vault false-activating at /vault/load
- LockedNavItem/Spending Monitor removed from Phase 36 nav spec — deferred feature, intentionally absent
- More-specific redirect paths listed before less-specific in next.config.ts redirects() array (e.g., /dashboard/forecasting before /dashboard, /subscriptions/:path* before /subscriptions)
- All proxy.ts hardcoded /dashboard redirect destinations updated to /payments/dashboard to eliminate redirect chaining
- /sources added to protectedRoutes in proxy.ts — was previously unprotected, added for completeness
- Verbatim copy strategy for new /payments/* route files — no refactoring at copy time to minimize diff surface
- 5 additional files updated beyond plan scope (sources, statements, vault breadcrumbs; error.tsx; not-found.tsx) — had /dashboard hrefs
- AccountFormValues uses string fields for all numeric inputs — z.coerce.number() causes unknown inference in useForm generics; parsing done at submit time
- EmptyState shared component not used in AccountList — requires href prop; account list needs onClick to open modal; inline JSX used instead

### Blockers/Concerns

**Phase 37 (Account CRUD):**
- All ACCT-01 through ACCT-08 requirements complete after Plan 02
- useDeleteFinancialAccount (not useDeleteAccount) — avoids collision with use-user.ts GDPR hook
- interestRate: form sends percentage, API divides by 100 before DB insert (decimal(5,4) column)
- PATCH /api/accounts/[id] strips accountType (type locked after creation) and invalidates five query keys: ["accounts"], ["vault","coverage"], ["vault","timeline"], ["sources"], ["transactions"]

**Production deployment (carried forward):**
- RESEND_FROM_EMAIL needs verified domain for email delivery
- NEXT_PUBLIC_SENTRY_DSN needed for Sentry error tracking
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY required for storage

## Session Continuity

Last session: 2026-02-26
Stopped at: Phase 37 Plan 02 complete — account UI components built, ACCT-08 wired
Resume file: .planning/phases/37-account-crud-list-page/37-02-SUMMARY.md
Resume with: `/gsd:execute-phase 37` (Plan 03)
