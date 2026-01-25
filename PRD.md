# Product Requirements Document: Subscription Manager

## Elevator Pitch

A web-only subscription manager that makes recurring spending easy to control. Users add subscriptions manually or import them from bank/credit-card statement PDFs (single or batch). The app converts messy transaction data into a clean dashboard of upcoming renewals, true monthly/yearly cost, and proactive reminders—without storing banking data or retaining PDFs.

---

## Target Audience

- **Primary:** Individuals in English-speaking countries (initial import focus: UK + US/CA/AU) who want visibility and control over recurring charges (streaming, gym, insurance, SaaS, memberships).
- **Secondary:** Budget-conscious users who want a simple, low-effort system with strong visuals.

---

## Business Objectives

### Revenue Model
- Subscription revenue: free trial (7–14 days) → paid plan.

### Success Criteria (MVP Targets)

| Category | Metric |
|----------|--------|
| **Activation** | % of users who add ≥5 subscriptions or complete first PDF import during trial |
| **Conversion** | Trial → paid conversion rate; time-to-convert; churn at 30/90 days |
| **Retention** | WAU/MAU; reminders delivered/opened; returning users per month |
| **Product Value** | Subscriptions tracked per user; renewal reminders sent; "unexpected renewal" incidents (self-reported) |
| **Operational** | PDF import success rate; low support tickets per import |

---

## Design & Content Principles

- **Visual Design:** Minimalist, visually striking interface with unique custom graphics (brandable iconography + chart style)
- **Primary Focus:** Clarity of "what renews next" and "what I'm spending (monthly/yearly)"
- **Interactions:** Low-friction—fast add/edit, smart defaults, bulk actions, keyboard-friendly web UI
- **Copy Tone:** Concise and reassuring; privacy-forward language during import
- **Accessibility:** Readable typography, high-contrast theme option, colour-blind friendly charts

---

## Functional Requirements

### 1. Web App Foundation

- Responsive web app (desktop-first acceptable; mobile responsive required)
- **Authentication:** Sign up, login, logout, password reset
- **Account Settings:** Currency, locale, notification preferences, data export, delete account

### 2. Subscription CRUD

#### Core Fields
| Field | Description |
|-------|-------------|
| Name | Subscription name |
| Category | Editable list with defaults |
| Cost | Amount + currency |
| Renewal Frequency | Monthly, yearly |
| Next Renewal Date | Date of next charge |
| Notes | Optional free text |

#### Status Controls
- **Active** – Included in dashboards and reminders
- **Paused** – Suppresses reminders until reactivated
- **Cancelled** – Excluded from "upcoming renewals" by default (toggle to include)

#### Behaviour Rules
- Cancelled subscriptions excluded from "upcoming renewals" by default (toggle to include)
- Paused subscriptions suppress reminders until reactivated
- Normalised monthly cost for yearly items (annual/12) for monthly totals

### 3. Dashboard & Analytics

#### Core Components
- Upcoming renewals list (7/14/30 days) with totals
- Total monthly spend (normalised) and total yearly spend

#### Visualisations
- **Annual bar chart:** Monthly spend over the year
- **Monthly pie chart:** Category spend breakdown
- **Payment method breakdown** (future: requires payment method capture)

#### Insights (MVP-light)
- Top 5 most expensive subscriptions
- Category totals

### 4. Search, Filters, Sorting

- **Search:** By subscription name (and mapped merchant name if imported)
- **Filters:** Category, status, frequency
- **Sorting:** Cost (desc/asc), next renewal date, name

### 5. Reminders (Multi-Channel)

#### Scheduling Rules
- **Defaults:** 7 days and 1 day before renewal (user-configurable)

#### Channels by Phase
| Channel | Phase |
|---------|-------|
| Email | MVP |
| SMS/Text | Phase 2/3 |
| WhatsApp | Phase 3 (WhatsApp Business integration) |
| Telegram | Phase 3 (bot-based delivery) |

#### Controls
- Per-subscription reminder toggle
- Snooze and "skip next reminder"
- Delivery log (sent / failed)

### 6. PDF Import (AI-Assisted)

#### Processing Goals
- Extract transactions (date, merchant/description, amount, currency)
- Detect likely subscriptions (recurrence + pattern matching) and propose:
  - Name (merchant)
  - Frequency (monthly/yearly)
  - Typical amount (or range)
  - Next renewal date (estimated)
  - Confidence score

#### Review Flow
- User confirms/edits proposed subscriptions before creation
- Bulk accept/edit
- Deduping: detect overlaps with existing subscriptions

#### Privacy Constraints (Hard Requirements)
- PDFs deleted immediately after processing
- No banking statements or raw transaction-level banking data stored long-term
- Store only derived subscription metadata and minimal import audit (e.g., "import completed", counts, timestamps)
- Explicit consent screen before upload

### 7. Billing / Monetisation

#### Trial Lifecycle
- Free trial: 7–14 days (configurable)
- Start trial on signup
- Reminder emails before trial end
- Grace period policy (TBD)

#### Feature Gating (Suggested)
- **Trial:** Full features included
- **Paid Required For:** Continued reminders + ongoing PDF import (and possibly unlimited subscriptions)

### 8. Export

- Export subscriptions + totals to CSV
- **Post-MVP:** PDF summary report

---

## User Stories

| ID | Story |
|----|-------|
| US-01 | As a user, I want to add a subscription in under 30 seconds so I can keep the system up to date with minimal effort. |
| US-02 | As a user, I want to upload one or many statement PDFs so the app can suggest subscriptions without me hunting through transactions. |
| US-03 | As a user, I want to review and confirm detected subscriptions so I stay in control of accuracy. |
| US-04 | As a user, I want to see what renews next so I avoid surprise charges. |
| US-05 | As a user, I want reminders by email/SMS/WhatsApp/Telegram so I receive them where I actually pay attention. |
| US-06 | As a user, I want to filter by category and sort by cost so I can quickly reduce spending. |
| US-07 | As a user, I want to mark a subscription as cancelled or paused so it stops cluttering my active renewals and reminders. |
| US-08 | As a user, I want reassurance that my PDFs are deleted immediately and no banking data is stored so I can trust the app. |

---

## User Interface

### Core Screens

#### 1. Landing + Pricing
- Value prop, privacy guarantees, trial CTA

#### 2. Signup / Login
- Standard authentication flows

#### 3. Onboarding
- Choose currency + reminder channels
- Quick "add first subscription" and "import PDF" options

#### 4. Dashboard
- Upcoming renewals cards
- Monthly + yearly totals
- Charts (annual bar, monthly category pie)

#### 5. Subscriptions
- Search + filter + sort toolbar
- List rows: name, category, cost, next renewal, status
- Quick actions: pause/cancel/edit

#### 6. Add/Edit Subscription
- Minimal form with smart defaults

#### 7. Import PDFs
- Upload (single/batch) → processing status → review proposals → confirm

#### 8. Settings
- Notification channels, trial/billing status, export, delete account, privacy statement

---

## Risks & Dependencies

### Key Risks

| Risk | Impact |
|------|--------|
| **PDF variability** | Extraction accuracy impacts trust and support load across banks/countries |
| **AI-assisted parsing** | False positives/negatives; needs strong review step and confidence scoring |
| **Messaging compliance** | SMS requires opt-in, sender reputation, cost control. WhatsApp requires Business onboarding/templates. Telegram requires bot delivery model and user initiation |
| **Privacy expectations** | Strong security posture required; clear "no banking data stored" implementation must be verifiable |

### Dependencies

| Dependency | Purpose | Examples |
|------------|---------|----------|
| Payment Provider | Subscriptions/trials | Stripe |
| Email Delivery | Reminders | SendGrid, Mailgun |
| SMS Provider | Text reminders | Twilio |
| WhatsApp Business API | WhatsApp reminders | Twilio, Meta partners |
| Telegram Bot API | Telegram reminders | Native Telegram API |
| PDF Processing Pipeline | OCR + extraction + AI classification | Secure ephemeral storage and job processing |

---

## Phasing Summary

| Phase | Features |
|-------|----------|
| **MVP** | Web app, auth, subscription CRUD, dashboard with charts, email reminders, PDF import, trial/billing, CSV export |
| **Phase 2** | SMS reminders, enhanced insights |
| **Phase 3** | WhatsApp reminders, Telegram reminders, payment method tracking, PDF summary export |
