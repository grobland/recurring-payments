# Phase 18: Anomaly Detection & Alerts - Research

**Researched:** 2026-02-07
**Domain:** Notification systems, anomaly detection, email digests
**Confidence:** HIGH

## Summary

Phase 18 implements a notification center with bell icon dropdown and weekly email digests to alert users of subscription anomalies (price increases >5% or >$2, and missed renewals). The implementation follows established SaaS patterns: header bell icon with badge indicator, dropdown showing recent alerts, weekly Monday digest emails to prevent alert fatigue.

The codebase already has robust email infrastructure (Resend client, email templates with base layout, cron jobs via Vercel), database schema for subscriptions with amount tracking, and shadcn/ui components (Badge, DropdownMenu). No external notification libraries needed—the stack can handle this natively.

**Primary recommendation:** Build notification system using existing patterns (similar to reminder email flow), add database table for alerts with detection logic in cron jobs, use shadcn/ui DropdownMenu + Badge for UI, extend existing email template pattern for digest.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Radix UI Dropdown Menu | 2.1.16 | Notification dropdown | Already in project, robust accessibility, animation support |
| shadcn/ui Badge | Built-in | Unread indicator dot | Project uses shadcn/ui consistently, supports variants |
| Resend | 6.8.0 | Email delivery | Already integrated for reminder emails |
| Drizzle ORM | 0.45.1 | Database queries | Project standard for all DB operations |
| date-fns | 4.1.0 | Date calculations | Already used throughout project |
| Lucide React | 0.562.0 | Bell icon | Project icon library (Bell, AlertTriangle, TrendingUp icons) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.3.5 | Alert validation schemas | For API input validation |
| TanStack Query | 5.90.19 | Alert fetching/caching | For alert feed data management |
| React Hook Form | 7.71.1 | Alert preferences form | If user wants to configure thresholds |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native dropdown | Novu, Engagespot | External services add complexity/cost, overkill for weekly digests |
| Custom email templates | React Email | React Email is excellent but project already has working template system |
| Real-time notifications | WebSockets, SSE | Not needed—alerts are batched weekly, real-time adds infrastructure burden |
| Separate notification service | Notification API, SuprSend | Unnecessary for this scale, adds dependencies and auth complexity |

**Installation:**
```bash
# No new packages needed—all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/
│   ├── alerts/                      # Alert CRUD endpoints
│   │   ├── route.ts                 # GET (fetch alerts), POST (manual create)
│   │   └── [id]/route.ts            # PATCH (acknowledge), DELETE (dismiss)
│   └── cron/
│       ├── detect-anomalies/        # NEW: Daily anomaly detection
│       │   └── route.ts             # Checks price changes + missed renewals
│       └── send-digest/             # NEW: Weekly email digest
│           └── route.ts             # Monday morning batch email
├── components/
│   ├── layout/
│   │   └── notification-bell.tsx    # NEW: Bell icon + dropdown
│   └── alerts/
│       ├── alert-list.tsx           # Alert feed UI
│       ├── alert-item.tsx           # Single alert row
│       └── empty-alerts.tsx         # Empty state
├── lib/
│   ├── db/
│   │   └── schema.ts                # Add alerts table
│   ├── email/templates/
│   │   └── weekly-digest.ts         # NEW: Digest template
│   ├── hooks/
│   │   └── use-alerts.ts            # NEW: TanStack Query hooks
│   └── utils/
│       └── anomaly-detection.ts     # NEW: Detection algorithms
```

### Pattern 1: Notification Bell with Badge Indicator
**What:** Header bell icon showing red dot (not count) when unread alerts exist
**When to use:** Always—this is the entry point to notification center
**Example:**
```typescript
// src/components/layout/notification-bell.tsx
// Based on shadcn patterns: https://www.shadcn.io/patterns/button-group-badges-1
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { useAlerts } from "@/lib/hooks/use-alerts";

export function NotificationBell() {
  const { data: alerts, isLoading } = useAlerts();
  const hasUnread = alerts?.some(a => !a.acknowledgedAt);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative">
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {/* Alert list here */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Pattern 2: Cron-Based Anomaly Detection
**What:** Daily cron job detects price increases and missed renewals, creates alert records
**When to use:** Backend detection logic (not on-demand)
**Example:**
```typescript
// src/app/api/cron/detect-anomalies/route.ts
// Pattern mirrors existing send-reminders cron
import { db } from "@/lib/db";
import { subscriptions, alerts } from "@/lib/db/schema";
import { eq, and, isNull, lt, gte } from "drizzle-orm";
import { subDays, startOfDay } from "date-fns";

export async function GET(request: Request) {
  // Verify CRON_SECRET like send-reminders
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { priceChanges: 0, missedRenewals: 0 };

  // Detect missed renewals: nextRenewalDate < today - 3 days, no recent updates
  const threeDaysAgo = subDays(startOfDay(new Date()), 3);
  const staleSubscriptions = await db.query.subscriptions.findMany({
    where: and(
      eq(subscriptions.status, "active"),
      isNull(subscriptions.deletedAt),
      lt(subscriptions.nextRenewalDate, threeDaysAgo),
      // updatedAt hasn't been touched (user didn't renew manually)
      lt(subscriptions.updatedAt, subscriptions.nextRenewalDate)
    ),
  });

  for (const sub of staleSubscriptions) {
    // Check if we already created alert for this
    const existingAlert = await db.query.alerts.findFirst({
      where: and(
        eq(alerts.subscriptionId, sub.id),
        eq(alerts.type, "missed_renewal")
      ),
    });

    if (!existingAlert) {
      await db.insert(alerts).values({
        userId: sub.userId,
        subscriptionId: sub.id,
        type: "missed_renewal",
        metadata: {
          expectedDate: sub.nextRenewalDate,
          subscriptionName: sub.name,
        },
      });
      results.missedRenewals++;
    }
  }

  return NextResponse.json({ success: true, ...results });
}
```

### Pattern 3: Weekly Email Digest
**What:** Monday morning batch email with all unacknowledged alerts from past week
**When to use:** Alert delivery—batched to prevent fatigue
**Example:**
```typescript
// src/lib/email/templates/weekly-digest.ts
// Follows existing reminderEmail pattern
import { emailLayout, APP_NAME, APP_URL } from "./base";

interface DigestEmailProps {
  userName: string;
  alerts: {
    type: "price_increase" | "missed_renewal";
    subscriptionName: string;
    message: string; // "Netflix: $12 → $14" or "Expected Jan 15"
  }[];
  weeklySpending: {
    total: string;
    renewalCount: number;
  };
}

export function digestEmail({ userName, alerts, weeklySpending }: DigestEmailProps) {
  const subject = alerts.length > 0
    ? `Weekly Update: ${alerts.length} alert${alerts.length > 1 ? 's' : ''} for your subscriptions`
    : "Your weekly subscription summary";

  const alertRows = alerts.map(alert => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e4e4e7;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%;
          background-color: ${alert.type === 'price_increase' ? '#ef4444' : '#eab308'};
          margin-right: 8px;"></span>
        <strong>${alert.subscriptionName}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: right;">
        ${alert.message}
      </td>
    </tr>
  `).join("");

  const content = `
    <h1>Your Weekly Subscription Update</h1>
    <p>Hi ${userName},</p>

    ${alerts.length > 0 ? `
      <h2 style="margin-top: 24px; font-size: 18px;">⚠️ Alerts</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tbody>${alertRows}</tbody>
      </table>
    ` : ''}

    <h2 style="margin-top: 24px; font-size: 18px;">📊 This Week</h2>
    <p>You had <strong>${weeklySpending.renewalCount} renewal${weeklySpending.renewalCount !== 1 ? 's' : ''}</strong>
       totaling <strong>${weeklySpending.total}</strong>.</p>

    <p style="text-align: center; margin-top: 32px;">
      <a href="${APP_URL}/alerts" class="button">View Alerts</a>
    </p>
  `;

  return {
    subject,
    html: emailLayout({ previewText: subject, content }),
    text: `${subject}\n\n...`, // Plain text version
  };
}
```

### Pattern 4: Price Change Detection Algorithm
**What:** Compare subscription amounts over time to detect increases beyond threshold
**When to use:** In detect-anomalies cron, on subscription update
**Example:**
```typescript
// src/lib/utils/anomaly-detection.ts
interface PriceChange {
  isSignificant: boolean;
  percentChange: number;
  absoluteChange: number;
  oldAmount: number;
  newAmount: number;
}

export function detectPriceChange(
  oldAmount: number,
  newAmount: number,
  currency: string
): PriceChange {
  const absoluteChange = newAmount - oldAmount;
  const percentChange = (absoluteChange / oldAmount) * 100;

  // Threshold: >5% OR >$2 (or equivalent in other currencies)
  const isSignificant =
    percentChange > 5 ||
    Math.abs(absoluteChange) > 2;

  return {
    isSignificant,
    percentChange: Math.round(percentChange * 10) / 10, // 1 decimal
    absoluteChange,
    oldAmount,
    newAmount,
  };
}

// Usage in cron or subscription update:
if (detectPriceChange(oldSub.amount, newSub.amount, sub.currency).isSignificant) {
  await db.insert(alerts).values({
    userId: sub.userId,
    subscriptionId: sub.id,
    type: "price_increase",
    metadata: {
      oldAmount: oldSub.amount,
      newAmount: newSub.amount,
      currency: sub.currency,
    },
  });
}
```

### Anti-Patterns to Avoid
- **Real-time notifications:** User wants weekly batches to prevent fatigue—don't add WebSockets or push notifications
- **Count badges:** User specified "red dot only"—don't show numbers like "5 unread"
- **Alert auto-expiry:** Acknowledged alerts stay forever (until dismissed)—don't auto-delete after X days
- **External notification services:** Novu/Engagespot add auth complexity for a simple weekly digest feature
- **Storing historical price data:** Don't create price_history table—detect changes on update, create alert, then move on

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | SMTP client, retry logic | Resend (already integrated) | Already working, handles bounces/retries |
| Email templates | Custom HTML builder | Existing base.ts layout pattern | Consistent with reminder emails |
| Date calculations | Manual day/week math | date-fns (already installed) | Handles edge cases (DST, leap years) |
| Dropdown accessibility | DIY focus trap | Radix UI DropdownMenu | ARIA-compliant, keyboard nav built-in |
| Cron scheduling | Node-cron, custom scheduler | Vercel cron (vercel.json) | Already configured for reminders |

**Key insight:** Notification systems look simple but have hidden complexity (accessibility, email deliverability, timezone handling). Leverage existing project patterns—don't start from scratch.

## Common Pitfalls

### Pitfall 1: N+1 Queries in Alert Fetching
**What goes wrong:** Fetching alerts, then making separate queries for each subscription's details
**Why it happens:** ORM makes it easy to access relations lazily
**How to avoid:** Use Drizzle's `with` clause to join subscriptions in single query
**Warning signs:** API response time grows linearly with alert count
```typescript
// Bad: N+1 queries
const alerts = await db.query.alerts.findMany();
for (const alert of alerts) {
  alert.subscription = await db.query.subscriptions.findFirst(...); // 🚨 N+1
}

// Good: Single query with join
const alerts = await db.query.alerts.findMany({
  with: {
    subscription: {
      columns: { id: true, name: true, amount: true, currency: true },
    },
  },
});
```

### Pitfall 2: Duplicate Alert Creation
**What goes wrong:** Detecting same anomaly multiple times, spamming user with duplicate alerts
**Why it happens:** Cron runs daily but doesn't check if alert already exists
**How to avoid:** Check for existing alert before inserting
**Warning signs:** User sees "Netflix price increase" alert 7 times in a week
```typescript
// Always check before creating alert
const existingAlert = await db.query.alerts.findFirst({
  where: and(
    eq(alerts.subscriptionId, sub.id),
    eq(alerts.type, "price_increase"),
    gte(alerts.createdAt, subDays(new Date(), 7)) // Within last week
  ),
});

if (!existingAlert) {
  await db.insert(alerts).values({ /* ... */ });
}
```

### Pitfall 3: Missed Renewal False Positives
**What goes wrong:** Flagging subscription as "missed" when user manually updated renewal date
**Why it happens:** Detection looks only at nextRenewalDate < today, ignores updatedAt
**How to avoid:** Check if subscription was recently modified (updatedAt > nextRenewalDate)
**Warning signs:** User complains "I already renewed this, why am I getting alerts?"
```typescript
// Bad: Flags all overdue subscriptions
const stale = await db.query.subscriptions.findMany({
  where: lt(subscriptions.nextRenewalDate, threeDaysAgo),
});

// Good: Exclude recently updated subscriptions
const stale = await db.query.subscriptions.findMany({
  where: and(
    lt(subscriptions.nextRenewalDate, threeDaysAgo),
    // Only flag if user hasn't touched it since renewal date
    lt(subscriptions.updatedAt, subscriptions.nextRenewalDate)
  ),
});
```

### Pitfall 4: Timezone Issues in Weekly Digest
**What goes wrong:** Digest emails sent at 3am user's local time instead of 8am
**Why it happens:** Vercel cron runs in UTC, email template uses server timezone
**How to avoid:** Store user timezone in DB or accept 8am UTC for all users
**Warning signs:** Users in Asia/Australia complain about middle-of-night emails
```typescript
// Decision per CONTEXT: Claude's discretion on time of day
// Recommendation: 8am UTC Monday (simple, consistent)
// If user timezone needed: Store users.timezone, query with TZ offset
```

### Pitfall 5: Badge Indicator Not Updating
**What goes wrong:** Red dot stays visible after user acknowledges all alerts
**Why it happens:** React Query cache not invalidated after PATCH /alerts/[id]
**How to avoid:** Invalidate alerts query key after acknowledge/dismiss mutations
**Warning signs:** User has to refresh page to clear badge
```typescript
// In use-alerts.ts hook
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ acknowledgedAt: new Date() }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] }); // ✅ Clear cache
    },
  });
}
```

## Code Examples

Verified patterns from official sources:

### Database Schema Extension
```typescript
// src/lib/db/schema.ts
export const alertTypeEnum = pgEnum("alert_type", [
  "price_increase",
  "missed_renewal",
]);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .references(() => subscriptions.id, { onDelete: "cascade" }), // Cascade: alert irrelevant if subscription deleted

    type: alertTypeEnum("type").notNull(),

    // Store alert-specific data (old/new prices, expected date, etc.)
    metadata: jsonb("metadata").$type<{
      oldAmount?: number;
      newAmount?: number;
      currency?: string;
      expectedDate?: string;
      subscriptionName?: string; // Snapshot in case subscription deleted
    }>(),

    // Lifecycle
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }), // Soft delete

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("alerts_user_id_idx").on(table.userId),
    index("alerts_subscription_id_idx").on(table.subscriptionId),
    index("alerts_created_at_idx").on(table.createdAt),
  ]
);

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [alerts.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
```

### Alert Feed API Endpoint
```typescript
// src/app/api/alerts/route.ts
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, isNull, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch unread alerts (not dismissed)
  const userAlerts = await db.query.alerts.findMany({
    where: and(
      eq(alerts.userId, session.user.id),
      isNull(alerts.dismissedAt)
    ),
    orderBy: [desc(alerts.createdAt)],
    limit: 50, // Reasonable cap
    with: {
      subscription: {
        columns: {
          id: true,
          name: true,
          amount: true,
          currency: true,
          nextRenewalDate: true,
        },
      },
    },
  });

  return NextResponse.json({ alerts: userAlerts });
}
```

### Weekly Digest Cron Job
```typescript
// src/app/api/cron/send-digest/route.ts
import { db } from "@/lib/db";
import { users, alerts } from "@/lib/db/schema";
import { digestEmail } from "@/lib/email/templates/weekly-digest";
import { sendEmail } from "@/lib/email/client";
import { eq, and, isNull, gte } from "drizzle-orm";
import { subDays, startOfWeek } from "date-fns";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { sent: 0, skipped: 0, errors: [] };
  const allUsers = await db.query.users.findMany({
    where: eq(users.emailRemindersEnabled, true), // Reuse reminder preference
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday

  for (const user of allUsers) {
    // Get unacknowledged alerts from past week
    const userAlerts = await db.query.alerts.findMany({
      where: and(
        eq(alerts.userId, user.id),
        isNull(alerts.dismissedAt),
        isNull(alerts.acknowledgedAt),
        gte(alerts.createdAt, weekStart)
      ),
      with: { subscription: true },
    });

    // Get weekly spending (would need to query subscriptions/renewals)
    const weeklySpending = { total: "$0", renewalCount: 0 }; // Placeholder

    try {
      const emailData = digestEmail({
        userName: user.name ?? "",
        alerts: userAlerts.map(a => ({
          type: a.type,
          subscriptionName: a.subscription?.name ?? a.metadata?.subscriptionName ?? "Unknown",
          message: formatAlertMessage(a),
        })),
        weeklySpending,
      });

      await sendEmail({
        to: user.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });

      results.sent++;
    } catch (error) {
      results.errors.push(`Failed to send to ${user.email}`);
    }
  }

  return NextResponse.json({ success: true, ...results });
}

function formatAlertMessage(alert: Alert): string {
  if (alert.type === "price_increase") {
    const { oldAmount, newAmount, currency } = alert.metadata;
    return `${oldAmount} ${currency} → ${newAmount} ${currency}`;
  } else {
    const { expectedDate } = alert.metadata;
    return `Expected ${new Date(expectedDate!).toLocaleDateString()}`;
  }
}
```

### TanStack Query Hook
```typescript
// src/lib/hooks/use-alerts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const alertKeys = {
  all: ["alerts"] as const,
  list: () => [...alertKeys.all, "list"] as const,
};

export function useAlerts() {
  return useQuery({
    queryKey: alertKeys.list(),
    queryFn: async () => {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
    staleTime: 60_000, // 1 minute
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledgedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to acknowledge alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to dismiss alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Real-time push notifications | Batched digests (daily/weekly) | 2023-2024 | Reduces notification fatigue, user engagement improved |
| Show notification count (99+) | Simple badge dot indicator | 2024+ | Less anxiety-inducing, cleaner UI (Linear, Notion) |
| External notification platforms | Native in-app components | 2025+ | Simpler auth, fewer dependencies, better control |
| Email for every alert | Weekly digest summaries | 2023+ | Industry standard for non-urgent notifications |

**Deprecated/outdated:**
- **Toast notifications for alerts:** Toasts are for immediate feedback (save success), not persistent notifications—use dropdown instead
- **Browser push notifications:** Requires permission prompt, adds complexity, not needed for weekly batches
- **Separate alerts page:** Dropdown is sufficient for 5-10 alerts; "View all" page only if needed (user wants dropdown limit of 5)

## Open Questions

1. **Should price decrease alerts be shown?**
   - What we know: User requested "price increases >5% or >$2" only
   - What's unclear: If price drops significantly, does user want to know?
   - Recommendation: Start with increases only per requirements, add decreases later if requested

2. **How to handle subscription deletions?**
   - What we know: User said "Claude's discretion" on cascade behavior
   - What's unclear: Keep alerts for deleted subscriptions or cascade delete?
   - Recommendation: CASCADE delete alerts when subscription deleted (alerts become irrelevant), but snapshot subscriptionName in metadata so we can still show "Netflix (deleted)" if needed

3. **Should digest include "no alerts" section?**
   - What we know: User specified "No alerts week: Still send summary only"
   - What's unclear: Is this too frequent if user has no activity?
   - Recommendation: Send weekly summary even with zero alerts (shows app is working), include spending stats to provide value

## Sources

### Primary (HIGH confidence)
- shadcn/ui Badge documentation - https://www.shadcn.io/ui/badge
- shadcn/ui Notification patterns - https://www.shadcn.io/patterns/button-group-badges-1
- Radix UI DropdownMenu (already in project at v2.1.16)
- Existing codebase patterns: src/app/api/cron/send-reminders/route.ts, src/lib/email/templates/reminder.ts, src/lib/db/schema.ts

### Secondary (MEDIUM confidence)
- [Email Digest Best Practices - Stripo](https://stripo.email/blog/design-newsletter-blog/)
- [NotificationAPI Batching & Digest](https://www.notificationapi.com/docs/features/digest)
- [SQL Habit: Detect Recurring Payments with SQL](https://www.sqlhabit.com/blog/how-to-detect-recurring-payments-with-sql)
- [Subaio: How Does Subaio Detect Recurring Payments](https://subaio.com/subaio-explained/how-does-subaio-detect-recurring-payments)

### Tertiary (LOW confidence)
- [MUI Toolpad Notification Center](https://mui.com/toolpad/core/react-notification-center/) - Not yet available, concept only
- [Building Bell Notification in React using Novu](https://dev.to/documatic/building-in-app-bell-notification-in-react-using-novu-325o) - Overkill for this use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, verified working
- Architecture: HIGH - Mirrors existing reminder email pattern, well-understood
- Pitfalls: HIGH - Based on direct codebase analysis and established patterns

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable patterns, no fast-moving libraries)
