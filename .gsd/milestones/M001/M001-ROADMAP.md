# M001: Migration

**Vision:** A web application for tracking and managing recurring subscriptions with Stripe-powered billing, a financial data vault, and structured account management.

## Success Criteria


## Slices

- [x] **S01: Service Configuration (2 plans)** `risk:medium` `depends:[]`
  > After this: unit tests prove Service Configuration (2 plans) works
- [x] **S02: PDF Import Verification (2 plans)** `risk:medium` `depends:[S01]`
  > After this: unit tests prove PDF Import Verification (2 plans) works
- [x] **S03: Core CRUD Verification (2 plans)** `risk:medium` `depends:[S02]`
  > After this: unit tests prove Core CRUD Verification (2 plans) works
- [x] **S04: Email Reminders Verification (1 plan)** `risk:medium` `depends:[S03]`
  > After this: unit tests prove Email Reminders Verification (1 plan) works
- [x] **S05: Category Management (3 plans)** `risk:medium` `depends:[S04]`
  > After this: unit tests prove Category Management (3 plans) works
- [x] **S06: Statement Source Tracking (3 plans)** `risk:medium` `depends:[S05]`
  > After this: unit tests prove Statement Source Tracking (3 plans) works
- [x] **S07: Smart Import UX (3 plans)** `risk:medium` `depends:[S06]`
  > After this: unit tests prove Smart Import UX (3 plans) works
- [x] **S08: Renewal Date Intelligence (2 plans)** `risk:medium` `depends:[S07]`
  > After this: unit tests prove Renewal Date Intelligence (2 plans) works
- [x] **S09: Reliability Foundation (2 plans)** `risk:medium` `depends:[S08]`
  > After this: unit tests prove Reliability Foundation (2 plans) works
- [x] **S10: Error Handling (3 plans)** `risk:medium` `depends:[S09]`
  > After this: unit tests prove Error Handling (3 plans) works
- [x] **S11: Loading & Empty States (2 plans)** `risk:medium` `depends:[S10]`
  > After this: unit tests prove Loading & Empty States (2 plans) works
- [x] **S12: Mobile & Visual Polish (3 plans)** `risk:medium` `depends:[S11]`
  > After this: unit tests prove Mobile & Visual Polish (3 plans) works
- [x] **S13: Analytics Infrastructure (3 plans)** `risk:medium` `depends:[S12]`
  > After this: unit tests prove Analytics Infrastructure (3 plans) works
- [x] **S14: Duplicate Detection (4 plans)** `risk:medium` `depends:[S13]`
  > After this: unit tests prove Duplicate Detection (4 plans) works
- [x] **S15: Spending Analytics & Trends (3 plans)** `risk:medium` `depends:[S14]`
  > After this: unit tests prove Spending Analytics & Trends (3 plans) works
- [x] **S16: Pattern Recognition (3 plans)** `risk:medium` `depends:[S15]`
  > After this: unit tests prove Pattern Recognition (3 plans) works
- [x] **S17: Spending Forecasting (4 plans)** `risk:medium` `depends:[S16]`
  > After this: unit tests prove Spending Forecasting (4 plans) works
- [x] **S18: Anomaly Detection & Alerts (4 plans)** `risk:medium` `depends:[S17]`
  > After this: unit tests prove Anomaly Detection & Alerts (4 plans) works
- [x] **S19: Batch Upload Foundation (5 plans)** `risk:medium` `depends:[S18]`
  > After this: unit tests prove Batch Upload Foundation (5 plans) works
- [x] **S20: Statement Browser & Filtering (2 plans)** `risk:medium` `depends:[S19]`
  > After this: unit tests prove Statement Browser & Filtering (2 plans) works
- [x] **S21: Manual Tagging & Conversion (6 plans)** `risk:medium` `depends:[S20]`
  > After this: unit tests prove Manual Tagging & Conversion (6 plans) works
- [x] **S22: Source Dashboard & Re Import (4 plans)** `risk:medium` `depends:[S21]`
  > After this: unit tests prove Source Dashboard & Re-import (4 plans) works
- [x] **S23: AI Suggestions & Pattern Detection (4 plans)** `risk:medium` `depends:[S22]`
  > After this: unit tests prove AI Suggestions & Pattern Detection (4 plans) works
- [x] **S24: Webhook Infrastructure Hardening (3 plans)** `risk:medium` `depends:[S23]`
  > After this: unit tests prove Webhook Infrastructure Hardening (3 plans) works
- [x] **S25: Multi Tier Product Setup (5 plans)** `risk:medium` `depends:[S24]`
  > After this: unit tests prove Multi-Tier Product Setup (5 plans) works
- [x] **S26: Feature Gating Infrastructure (2 plans)** `risk:medium` `depends:[S25]`
  > After this: unit tests prove Feature Gating Infrastructure (2 plans) works
- [x] **S27: Pricing & Portal UI (3 plans)** `risk:medium` `depends:[S26]`
  > After this: unit tests prove Pricing & Portal UI (3 plans) works
- [x] **S28: Voucher System (3 plans)** `risk:medium` `depends:[S27]`
  > After this: unit tests prove Voucher System (3 plans) works
- [x] **S29: Apply Feature Gating (1 plan)** `risk:medium` `depends:[S28]`
  > After this: unit tests prove Apply Feature Gating (1 plan) works
- [x] **S30: Fix URLs & Admin Security (2 plans)** `risk:medium` `depends:[S29]`
  > After this: unit tests prove Fix URLs & Admin Security (2 plans) works
- [x] **S31: Storage Foundation (2 plans) — completed 2026 02 19** `risk:medium` `depends:[S30]`
  > After this: unit tests prove Storage Foundation (2 plans) — completed 2026-02-19 works
- [x] **S32: PDF Viewer (2 plans) — completed 2026 02 19** `risk:medium` `depends:[S31]`
  > After this: unit tests prove PDF Viewer (2 plans) — completed 2026-02-19 works
- [x] **S33: Vault UI (2 plans) — completed 2026 02 20** `risk:medium` `depends:[S32]`
  > After this: unit tests prove Vault UI (2 plans) — completed 2026-02-20 works
- [x] **S34: Coverage & Historical Upload (3 plans) — completed 2026 02 21** `risk:medium` `depends:[S33]`
  > After this: unit tests prove Coverage & Historical Upload (3 plans) — completed 2026-02-21 works
- [x] **S35: Database Foundation** `risk:medium` `depends:[S34]`
  > After this: Prepare the Drizzle schema for the financial_accounts table migration by renaming the conflicting manual backfill file and editing schema.
- [x] **S36: Navigation Restructure** `risk:medium` `depends:[S35]`
  > After this: Add 308 permanent redirects for all moved URLs in next.
- [x] **S37: Account Crud List Page** `risk:medium` `depends:[S36]`
  > After this: Build the complete backend data layer for financial account CRUD: schema migration for source linking, Zod validation, REST API routes, and TanStack Query hooks.
- [x] **S38: Account Detail Pages** `risk:medium` `depends:[S37]`
  > After this: Build all backend API endpoints and client-side hooks needed for account detail page data fetching: account-scoped coverage, spending aggregates, and accountId-filtered transactions.
- [x] **S39: Payment Type Selector** `risk:medium` `depends:[S38]`
  > After this: unit tests prove payment-type-selector works
- [x] **S40: Static Pages** `risk:medium` `depends:[S39]`
  > After this: Create two static content pages and add sidebar navigation entries: a Data Schema page showing all 21 database tables as card-based column listings, and a Help page with accordion-organized FAQ sections grouped by category.
- [x] **S41: E2E Test Infrastructure (3 plans) — completed 2026 03 03** `risk:medium` `depends:[S40]`
  > After this: unit tests prove E2E Test Infrastructure (3 plans) — completed 2026-03-03 works
- [x] **S42: CSV Export (2 plans) — completed 2026 03 03** `risk:medium` `depends:[S41]`
  > After this: unit tests prove CSV Export (2 plans) — completed 2026-03-03 works
- [x] **S43: Overlap Detection** `risk:medium` `depends:[S42]`
  > After this: Build the overlap detection logic and badge component that Plan 02 will wire into the subscriptions page.
- [x] **S44: Onboarding Hints** `risk:medium` `depends:[S43]`
  > After this: Build the hint dismissal hook and dismissible empty state wrapper component that Plan 02 will integrate into all five pages.
- [x] **S45: Sidebar Redesign** `risk:medium` `depends:[S44]`
  > After this: Redesign the sidebar navigation to use plain English labels, reorganize into 4+ logical groups, and apply a warm/friendly visual theme (Notion/Todoist aesthetic) that works in both light and dark modes.
- [x] **S46: Performance Audit** `risk:medium` `depends:[S45]`
  > After this: Install @next/bundle-analyzer, configure next.
