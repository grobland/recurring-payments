# Requirements: Subscription Manager

**Defined:** 2026-03-02
**Core Value:** Users can see all their subscriptions in one place and never get surprised by a renewal again

## v3.1 Requirements

Requirements for v3.1 UX & Quality milestone. Each maps to roadmap phases.

### Sidebar Redesign

- [ ] **SIDE-01**: User sees plain English labels on all sidebar nav items (Dashboard, Subscriptions, Upload Statements, etc.)
- [ ] **SIDE-02**: Sidebar uses warm/friendly accent colors for active item and hover states (Notion/Todoist aesthetic)
- [ ] **SIDE-03**: Sidebar sections reorganized into 4+ logical groups with clearer section names
- [ ] **SIDE-04**: Sidebar icons refreshed to complement warm visual design
- [ ] **SIDE-05**: Feature-gate logic preserved via typed nav item data structure during redesign
- [ ] **SIDE-06**: Warm theme works correctly in both light and dark modes

### Onboarding Hints

- [ ] **ONBRD-01**: User sees contextual hint with action CTA on empty subscriptions list
- [ ] **ONBRD-02**: User sees contextual hint with action CTA on empty vault
- [ ] **ONBRD-03**: User sees contextual hint with action CTA on empty transactions page
- [ ] **ONBRD-04**: User sees contextual hint with action CTA on empty dashboard
- [ ] **ONBRD-05**: User sees contextual hint with action CTA on empty suggestions page
- [ ] **ONBRD-06**: User can dismiss hints individually and dismissal persists across page refresh

### Data Export

- [ ] **EXPRT-01**: User can download active subscriptions as CSV from subscriptions page
- [ ] **EXPRT-02**: User can download transaction history as CSV from transactions page
- [ ] **EXPRT-03**: CSV export sanitizes formula injection characters (CWE-1236 prevention)
- [ ] **EXPRT-04**: CSV files include UTF-8 BOM for correct Excel rendering of international characters

### Overlap Detection

- [ ] **OVRLP-01**: User sees inline badge on subscription rows that are part of a same-category overlap group
- [ ] **OVRLP-02**: User can dismiss overlap badges per group
- [ ] **OVRLP-03**: Dismissed badges re-surface automatically when the subscription set changes

### E2E Testing

- [ ] **TEST-01**: Existing E2E tests updated with correct v3.0 URLs and pass cleanly
- [ ] **TEST-02**: 25-30 Playwright tests cover all major user flows (auth, subscriptions, vault, analytics, billing, accounts, export, overlap, onboarding)
- [ ] **TEST-03**: Interactive elements use data-testid attributes for reliable test selectors

### Performance

- [ ] **PERF-01**: Bundle treemap report generated and committed
- [ ] **PERF-02**: Lighthouse baseline scores documented (targets: Performance 80+, Accessibility 95+, Best Practices 95+)
- [ ] **PERF-03**: optimizePackageImports configured for lucide-react in next.config.ts
- [ ] **PERF-04**: Heavy components (react-pdf, recharts) dynamically imported based on audit findings

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Overlap Enhancements

- **OVRLP-04**: Overlap detection shows combined cost breakdown per category ("$47/mo across 3 services")

### Testing Infrastructure

- **TEST-04**: E2E tests run in CI via GitHub Actions workflow
- **TEST-05**: Lighthouse regression gating on PRs

### Onboarding Enhancements

- **ONBRD-07**: Contextual onboarding hint for billing/upgrade path when user hits feature gate
- **ONBRD-08**: Full onboarding checklist with progress tracking

### Accessibility

- **A11Y-01**: WCAG 2.1 AA accessibility audit pass

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full product tour with overlay (Shepherd.js, Intro.js) | 30-60KB JS, <20% completion rate, goes stale when UI changes; contextual hints are more effective |
| Bulk CSV import to add subscriptions | Breaks PDF-centric mental model; high support burden for data quality issues |
| PDF export of subscription report | Server-side PDF generation adds meaningful complexity; browsers can print natively |
| E2E tests for every API endpoint | API testing belongs in Vitest unit/integration tests, not Playwright |
| Lighthouse score target of 100 | react-pdf + recharts make this unrealistic without removing features; 80+ is realistic |
| Auto-dismiss overlap warnings on timer | Suppressing money-saving warnings undermines core value prop |
| Provider name matching for overlaps | Fragile; category-based grouping is more durable since users assigned categories |
| Cross-device hint dismissal via DB | Only warranted if analytics show meaningful cross-device usage |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SIDE-01 | Phase 45 | Pending |
| SIDE-02 | Phase 45 | Pending |
| SIDE-03 | Phase 45 | Pending |
| SIDE-04 | Phase 45 | Pending |
| SIDE-05 | Phase 45 | Pending |
| SIDE-06 | Phase 45 | Pending |
| ONBRD-01 | Phase 44 | Pending |
| ONBRD-02 | Phase 44 | Pending |
| ONBRD-03 | Phase 44 | Pending |
| ONBRD-04 | Phase 44 | Pending |
| ONBRD-05 | Phase 44 | Pending |
| ONBRD-06 | Phase 44 | Pending |
| EXPRT-01 | Phase 42 | Pending |
| EXPRT-02 | Phase 42 | Pending |
| EXPRT-03 | Phase 42 | Pending |
| EXPRT-04 | Phase 42 | Pending |
| OVRLP-01 | Phase 43 | Pending |
| OVRLP-02 | Phase 43 | Pending |
| OVRLP-03 | Phase 43 | Pending |
| TEST-01 | Phase 41 | Pending |
| TEST-02 | Phase 41 | Pending |
| TEST-03 | Phase 41 | Pending |
| PERF-01 | Phase 46 | Pending |
| PERF-02 | Phase 46 | Pending |
| PERF-03 | Phase 46 | Pending |
| PERF-04 | Phase 46 | Pending |

**Coverage:**
- v3.1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after roadmap creation — all 26 requirements mapped*
