# Project Research Summary

**Project:** Subscription Manager v1.1 - Import Improvements
**Domain:** Brownfield Enhancement - AI-powered PDF Import & Category Management
**Researched:** 2026-01-31
**Confidence:** HIGH

## Executive Summary

This research examines how to enhance an existing production subscription manager by improving AI-powered PDF import with confidence-based workflows, statement source tracking, and category management fixes. The critical insight: this is a **brownfield enhancement**, not greenfield development. Breaking changes affect real users with production data, and "showing all AI detections" fundamentally changes the product promise from "curated results" to "you decide."

The recommended approach leverages existing infrastructure (OpenAI GPT-4o with Structured Outputs, Drizzle ORM, Next.js 16 App Router) and adds only two lightweight dependencies: chrono-node for natural language date parsing and shadcn/ui Combobox for category selection. All schema changes are backward-compatible via nullable columns and multi-step migrations. The architecture supports all improvements with minimal refactoring—changes are isolated to AI prompt tuning, single column additions, and client-side UI enhancements.

The key risk is miscalibrated user expectations around AI confidence scores. Research shows users can't detect miscalibration, leading to either over-reliance (accepting garbage) or under-reliance (rejecting good suggestions). Mitigation requires tiered confidence display, empirical threshold calibration from user feedback, and careful A/B testing before changing filtering behavior. Secondary risks include schema migration safety (foreign keys without indexes cause table locks) and transaction date vs. billing date confusion (statements show settlement dates, not renewal dates).

## Key Findings

### Recommended Stack

The existing stack handles all requirements—only two lightweight additions needed. OpenAI GPT-4o already supports structured outputs with JSON schema validation (no new ML libraries required). The pdf2json extraction works well; the issue is prompt engineering, not parsing quality.

**Core technologies:**
- **chrono-node ^2.9.0**: Natural language date parsing ("next Friday", "Feb 15") — mature library with 518 dependent projects, handles relative and absolute dates
- **shadcn/ui Combobox component**: Searchable category dropdown with inline creation — zero new npm dependencies (uses existing Popover + Command)
- **OpenAI Structured Outputs (existing openai@6.16.0)**: Confidence scoring, bank name extraction, date extraction via JSON schema — 100% schema compliance, eliminates post-processing errors

**Rejected additions:**
- Pattern recognition libraries (use GPT-4o instead)
- Bank statement parser libraries (Python-based or expensive SaaS)
- Additional date libraries (date-fns + chrono-node sufficient)

**Bundle impact:** +52KB gzipped (acceptable for improved UX)

### Expected Features

**Must have (table stakes):**
- **Show all detected items** — users expect to see everything AI found, not filtered subset (currently hidden by confidence threshold)
- **Visual confidence indicators** — standard in AI/ML features; color-coded badges (green/yellow/red per Mindee/Docsumo patterns)
- **Manual selection/deselection** — users need control over what gets imported with checkbox UI
- **Prevent duplicate categories** — database has unique constraint, but UI allows duplicates (validation bug)
- **Category CRUD operations** — create, update, delete with safe deletion flow (show affected subscriptions)
- **Import session tracking** — display which bank/statement each subscription came from (import_audits table exists but needs UI)

**Should have (competitive):**
- **Confidence-based workflows** — threshold configuration for auto-approval with manual review queue
- **Statement source tracking** — organize imports by bank/card; autocomplete from previous sources
- **Transaction date tracking** — calculate renewal dates from actual statement dates, not import date
- **Category suggestions** — AI-powered category recommendations based on merchant patterns
- **Import history timeline** — visual UI for import audit log with source/date/counts

**Defer (v2+):**
- Confidence threshold configuration (user-set auto-select threshold)
- Batch confidence operations ("reject all below X%")
- Confidence reasoning (why AI gave this score)
- Statement data viewer (show raw detected data from past imports)

### Architecture Approach

All enhancements integrate with existing Next.js 16 App Router and Drizzle ORM architecture via additive changes. No component refactoring needed—modifications are backward-compatible prop expansions and hook enhancements. The current Route Handler pattern (not Server Actions) is correct for file uploads and aligns with Next.js 16 best practices.

**Major components:**
1. **AI Extraction Pipeline** — enhance OpenAI prompt to use structured outputs with JSON schema for confidence/bank name/transaction date; add chrono-node post-processing for renewal date calculation
2. **Schema Evolution** — add single nullable `statementSource` column via multi-step migration (add nullable → backfill → add FK with NOT VALID → validate); no breaking changes
3. **Category Management** — fix deduplication in useCategoryOptions hook (client-side filtering, prefer custom over default); add Combobox component to replace basic Select
4. **Import Confirmation UI** — show all items with tiered confidence display (green 80%+, yellow 60-79%, red <60%); auto-select high confidence; persist confidence scores for analytics

**Data flow:** PDF Upload → OpenAI (all items + metadata) → Review (smart defaults) → Confirm → DB (with source tracking)

### Critical Pitfalls

1. **Confidence threshold changes break user trust** — changing from "curated results" to "show all with scores" creates cognitive overload; users can't detect miscalibration. Use tiered display with toggle for low-confidence items, not flat list. A/B test before rolling out.

2. **Adding foreign keys without migration strategy** — nullable columns need backfill plan for existing data; adding FK without index causes table locks. Use multi-step migration: add nullable → backfill → create index CONCURRENTLY → add FK NOT VALID → validate.

3. **Transaction date ≠ billing date** — statements show settlement dates (when bank processed), not billing dates (when merchant charged). Gap is 1-7 days. Calculate renewal from transaction date but add UI warning to adjust earlier if needed.

4. **Category dropdown duplicates from query logic** — unique constraint allows `(NULL, "streaming")` and `("user-123", "streaming")` to coexist. Fix validation to check both default and user categories; deduplicate client-side preferring custom over default.

5. **Schema changes break TanStack Query cache** — new fields cause runtime errors on cached old responses. Version cache keys on breaking changes or deploy readers first (code handles both schemas) then add fields.

## Implications for Roadmap

Based on research, suggested **4-phase structure** prioritizing data foundation before UX enhancements:

### Phase 1: Statement Source Tracking (Foundation)
**Rationale:** Single schema change establishes data tracking foundation; isolated change with clear boundaries
**Delivers:** Statement source persistence, bank name extraction via AI
**Addresses:** Statement source tracking feature (should-have); import history tracking (table stakes)
**Avoids:** Pitfall #2 (FK migration strategy) via multi-step deployment
**Stack:** OpenAI structured outputs (existing), Drizzle migration
**Complexity:** Medium (schema migration requires backfill strategy)

### Phase 2: Smart Import UX (User-Facing Impact)
**Rationale:** Pure prompt tuning and UI changes; no schema dependencies; addresses user complaint directly
**Delivers:** Show all detected items with visual confidence indicators, manual selection UI
**Addresses:** Show all items, visual confidence, manual selection (all table stakes)
**Avoids:** Pitfall #1 (confidence trust) via tiered display with toggle, not flat list; Pitfall #7 (persist scores) by adding to schema
**Stack:** React Hook Form, shadcn/ui badges
**Complexity:** Low (UI-only, prompt tuning)

### Phase 3: Renewal Date Intelligence (Data Quality)
**Rationale:** Builds on AI extraction enhancements from Phase 2; adds utility function with fallback
**Delivers:** Transaction date extraction, calculated renewal dates with user confirmation
**Addresses:** Transaction date tracking (should-have), renewal date accuracy (implicit quality requirement)
**Avoids:** Pitfall #3 (transaction ≠ billing date) via UI warning and adjustment option
**Stack:** chrono-node, date-fns, OpenAI prompt enhancement
**Complexity:** Low (graceful fallback to existing behavior)

### Phase 4: Category Management (Bug Fixes + Polish)
**Rationale:** Pure client-side fixes; can be parallelized with other phases; addresses blocking UX bug
**Delivers:** Deduplicated category dropdown, CRUD UI with safe deletion, Combobox component
**Addresses:** Prevent duplicates, category CRUD, safe deletion (all table stakes)
**Avoids:** Pitfall #4 (duplicate categories) via validation fix and client deduplication
**Stack:** shadcn/ui Combobox (zero new dependencies)
**Complexity:** Medium (CRUD flows, confirmation modals)

### Phase Ordering Rationale

- **Phase 1 first** because schema changes require multi-step migration across deployments; establish data foundation before building features on top
- **Phase 2 second** because it's the highest user-facing impact (addresses "AI misses subscriptions" complaint) and has no schema dependencies
- **Phase 3 third** because it builds on AI prompt enhancements from Phase 2 (transaction date extraction) and is independent of Phase 1
- **Phase 4 last** because it's purely client-side and can be developed in parallel with others; no dependencies on prior phases

**Parallelization opportunity:** Phases 2, 3, and 4 can be developed concurrently after Phase 1 schema migration completes.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 1 (Statement Sources):** Multi-step migration pattern for production database with existing data; backfill strategy for historical imports; foreign key index creation timing
- **Phase 2 (Smart Import UX):** A/B testing strategy for confidence threshold changes; empirical calibration of GPT-4o confidence scores on real bank statements

**Phases with standard patterns (skip research-phase):**
- **Phase 3 (Renewal Date Intelligence):** Standard date parsing utilities, well-documented chrono-node integration, fallback pattern established
- **Phase 4 (Category Management):** Standard CRUD operations, established shadcn/ui patterns, React Hook Form validation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack sufficient; only 2 lightweight additions with clear use cases and mature libraries |
| Features | HIGH | Combination of direct codebase analysis and standard AI/finance app patterns from multiple sources |
| Architecture | HIGH | All changes are additive or backward-compatible; integration points clearly identified in existing code |
| Pitfalls | HIGH | Brownfield-specific pitfalls with concrete examples from codebase; migration patterns from GitLab/PostgreSQL docs |

**Overall confidence:** HIGH

### Gaps to Address

- **AI confidence calibration accuracy:** GPT-4o confidence scores need empirical validation with real bank statements from diverse sources (Chase, BOA, Amex, etc.). Thresholds are currently arbitrary (70%, 80%); should be calibrated after 100+ imports based on user acceptance rates.

- **Transaction date extraction reliability:** Bank statement formats vary significantly across institutions. AI prompt may work well for Chase but poorly for smaller banks. Requires testing with representative sample of statement formats during Phase 3 planning.

- **Category duplicate root cause:** Research identified the validation logic bug, but needs confirmation that this is the sole cause. Could also be race condition from concurrent category creation or client-side caching issue. Verify with user session logs.

**Mitigation approach:** Each gap is isolated to a specific phase with clear validation criteria (Phase 1: migration rollback test; Phase 2: A/B test metrics; Phase 3: multi-bank statement testing).

## Sources

### Primary (HIGH confidence)
- **Existing codebase** — schema.ts, pdf-parser.ts, import/page.tsx, api/categories/route.ts (direct analysis of current implementation)
- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs) — JSON schema compliance, confidence scoring patterns
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations) — schema evolution best practices
- [GitLab: Add Foreign Key to Existing Column](https://docs.gitlab.com/ee/development/database/add_foreign_key_to_existing_column.html) — multi-step migration pattern
- [shadcn/ui Combobox](https://ui.shadcn.com/docs/components/combobox) — component composition, no new dependencies

### Secondary (MEDIUM confidence)
- [Understanding Effects of Miscalibrated AI Confidence](https://arxiv.org/html/2402.07632v4) — user trust research, calibration communication
- [Docsumo: Confidence Score Documentation](https://support.docsumo.com/docs/confidence-score) — industry UX patterns for confidence display
- [Schema Evolution and Compatibility - Confluent](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html) — backward compatibility strategies
- [Next.js Server Actions vs API Routes](https://dev.to/myogeshchavan97/nextjs-server-actions-vs-api-routes-dont-build-your-app-until-you-read-this-4kb9) — Route Handler pattern validation
- [Santander: Anatomy of Bank Statement](https://www.santander.com/en/stories/anatomy-of-a-bank-statement-whats-in-it) — transaction vs. value dates

### Tertiary (LOW confidence)
- chrono-node npm downloads (518 dependent projects) — popularity metric for library maturity
- Subscription tracker app reviews (CNBC, Kudos, Rob Berger) — feature expectations inference from competitor analysis

---
*Research completed: 2026-01-31*
*Ready for roadmap: yes*
