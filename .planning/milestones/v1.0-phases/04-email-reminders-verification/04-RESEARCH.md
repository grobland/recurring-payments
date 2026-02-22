# Phase 4: Email Reminders Verification - Research

**Researched:** 2026-01-30
**Domain:** Email delivery verification, Resend API, Vercel Cron testing
**Confidence:** HIGH

## Summary

This phase verifies that email reminders are sent when subscriptions are due for renewal. The codebase already has a complete email reminder system implemented:

- **Email client** (`src/lib/email/client.ts`) - Resend SDK wrapper with lazy initialization
- **Email templates** (`src/lib/email/templates/reminder.ts`) - HTML/text templates for renewal reminders
- **Cron endpoint** (`/api/cron/send-reminders`) - Full reminder processing logic including deduplication
- **Reminder logs** (`reminder_logs` table) - Tracks all sent/failed reminders with Resend message IDs
- **Vercel cron config** (`vercel.json`) - Scheduled to run daily at 9 AM UTC

The verification task is to trigger the reminder system manually and confirm an email is actually delivered. Resend provides test email addresses (`delivered@resend.dev`) for safe testing without affecting sender reputation.

**Primary recommendation:** Test the cron endpoint manually with curl/fetch, verify reminder log is created with "sent" status, and optionally verify delivery via Resend's retrieve API.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | ^6.8.0 | Email delivery API | Already installed, modern email API with excellent DX |
| date-fns | ^4.1.0 | Date calculations | Already used for renewal date calculations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @playwright/test | ^1.57.0 | E2E testing | Already configured with auth state reuse |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual API test | Playwright E2E test | E2E test would be more comprehensive but requires more setup; manual test is simpler for one-time verification |
| Actual email delivery | Resend test addresses | Test addresses simulate delivery without affecting reputation or requiring real inbox checks |

**Installation:**
Already installed - no new dependencies needed.

## Architecture Patterns

### Existing Email Infrastructure
```
src/
├── lib/
│   └── email/
│       ├── client.ts           # Resend client wrapper
│       └── templates/
│           ├── base.ts         # Email layout template
│           └── reminder.ts     # Reminder-specific template
├── app/
│   └── api/
│       ├── cron/
│       │   └── send-reminders/ # Cron job endpoint
│       ├── reminders/
│       │   ├── route.ts        # User reminder settings
│       │   └── logs/route.ts   # Reminder history
│       └── subscriptions/
│           └── [id]/
│               └── reminder/   # Per-subscription controls
```

### Pattern 1: Cron Endpoint Testing
**What:** Trigger `/api/cron/send-reminders` with CRON_SECRET authorization
**When to use:** Manual or automated verification of email sending
**Example:**
```typescript
// Test trigger with auth header
const response = await fetch('/api/cron/send-reminders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.CRON_SECRET}`
  }
});
const result = await response.json();
// Result includes: { remindersSent, remindersFailed, errors }
```

### Pattern 2: Using Resend Test Addresses
**What:** Designate email addresses that simulate delivery events
**When to use:** Testing without affecting sender reputation
**Example:**
```typescript
// Test addresses from Resend documentation
const testAddresses = {
  delivered: 'delivered@resend.dev',
  bounced: 'bounced@resend.dev',
  complained: 'complained@resend.dev',
  suppressed: 'suppressed@resend.dev'
};

// Labels supported for tracking
'delivered+test1@resend.dev'  // Track specific test scenarios
```

### Pattern 3: Verify Email Status via API
**What:** Use Resend's retrieve API to check email delivery status
**When to use:** Confirming email was actually sent and delivered
**Example:**
```typescript
// After sending, get the email ID from response
const sendResult = await sendEmail({...});
const emailId = sendResult?.id;

// Retrieve email status
const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
  headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` }
});
const email = await response.json();
// email.last_event = 'delivered' | 'bounced' | etc.
```

### Anti-Patterns to Avoid
- **Testing with production email addresses:** Use `@resend.dev` test addresses
- **Testing without CRON_SECRET:** The endpoint returns 401 without proper auth
- **Ignoring reminder_logs:** The DB already tracks all send attempts - use it

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery verification | Custom inbox polling | Resend retrieve API or logs table | System already logs every send with message ID |
| Test email addresses | Using real user emails | `delivered@resend.dev` | Protects sender reputation |
| Cron job local testing | Complex scheduling | Manual POST to endpoint | Endpoint accepts both GET and POST |

**Key insight:** The existing implementation already handles the hard parts (deduplication, logging, error handling). Verification is about confirming the existing code works, not building new functionality.

## Common Pitfalls

### Pitfall 1: Missing CRON_SECRET
**What goes wrong:** 401 Unauthorized response
**Why it happens:** CRON_SECRET not set in environment
**How to avoid:** Ensure CRON_SECRET is in `.env.local` and passed in Authorization header
**Warning signs:** Test returns `{ error: "Unauthorized" }`

### Pitfall 2: No Subscriptions Match Reminder Criteria
**What goes wrong:** `remindersProcessed: 0` - no emails sent
**Why it happens:** No active subscriptions with `nextRenewalDate` within reminder window
**How to avoid:** Create a subscription with renewal date 1 or 7 days in future, ensure `emailRemindersEnabled: true`
**Warning signs:** API returns success but `remindersSent: 0`

### Pitfall 3: Testing With Wrong User Email
**What goes wrong:** Can't verify if email was actually received
**Why it happens:** User email is real address, email goes to production inbox
**How to avoid:** For automated tests, update user email to `delivered@resend.dev` before triggering, or verify via reminder_logs + Resend API
**Warning signs:** No way to verify delivery programmatically

### Pitfall 4: Reminder Already Sent Today
**What goes wrong:** `toSend.length === 0` due to deduplication
**Why it happens:** The cron checks `reminderLogs` for same-day sends
**How to avoid:** Clear relevant reminder logs or use different subscription
**Warning signs:** `remindersProcessed: N` but `remindersSent: 0`

## Code Examples

### Triggering Cron Endpoint Manually
```typescript
// Source: Existing cron endpoint implementation
async function testSendReminders(baseUrl: string, cronSecret: string) {
  const response = await fetch(`${baseUrl}/api/cron/send-reminders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cronSecret}`
    }
  });

  const result = await response.json();
  // {
  //   success: true,
  //   remindersProcessed: number,
  //   remindersSent: number,
  //   remindersFailed: number,
  //   trialRemindersProcessed: number,
  //   trialRemindersSent: number,
  //   errors: string[]
  // }
  return result;
}
```

### Checking Reminder Logs
```typescript
// Source: Existing reminder_logs schema
// After triggering, verify in database:
const log = await db.query.reminderLogs.findFirst({
  where: and(
    eq(reminderLogs.subscriptionId, subscriptionId),
    eq(reminderLogs.status, 'sent')
  ),
  orderBy: [desc(reminderLogs.createdAt)]
});

// log contains:
// - status: 'sent' | 'failed' | 'pending'
// - resendMessageId: string (from Resend API response)
// - emailTo: string
// - emailSubject: string
// - sentAt: Date
```

### Creating Test Data for Reminders
```typescript
// Ensure subscription matches reminder criteria
import { addDays } from 'date-fns';

// Create subscription renewing in 1 day (default reminder window)
const subscription = await db.insert(subscriptions).values({
  userId: testUserId,
  name: 'Test Reminder Subscription',
  amount: '9.99',
  currency: 'USD',
  frequency: 'monthly',
  normalizedMonthlyAmount: '9.99',
  nextRenewalDate: addDays(new Date(), 1), // Triggers 1-day reminder
  status: 'active',
  reminderEnabled: true
}).returning();

// Ensure user has reminders enabled
await db.update(users)
  .set({ emailRemindersEnabled: true })
  .where(eq(users.id, testUserId));
```

### Playwright API Test Pattern
```typescript
// Source: https://playwright.dev/docs/api-testing
import { test, expect } from '@playwright/test';

test('can trigger email reminder via cron endpoint', async ({ request }) => {
  const cronSecret = process.env.CRON_SECRET;

  const response = await request.post('/api/cron/send-reminders', {
    headers: {
      'Authorization': `Bearer ${cronSecret}`
    }
  });

  expect(response.ok()).toBeTruthy();

  const result = await response.json();
  expect(result.success).toBe(true);
  // If test data is set up correctly:
  // expect(result.remindersSent).toBeGreaterThan(0);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nodemailer / SMTP | Resend API | 2023-2024 | Simpler integration, better deliverability |
| Email verification via inbox | Resend retrieve API + webhooks | 2024+ | Programmatic verification possible |
| Separate test environments | Resend test addresses | 2024+ | Test production code with simulated events |

**Deprecated/outdated:**
- Using `@example.com` for test emails (Resend blocks with 422)
- Manual inbox checking for verification (use API instead)

## Open Questions

1. **Whether to update user email for testing**
   - What we know: Current user email is real, emails will be sent there
   - What's unclear: Should we temporarily update to `delivered@resend.dev`?
   - Recommendation: For minimal-touch verification, just check reminder_logs; for full E2E, use test address

2. **Vercel deployment requirement**
   - What we know: Crons only run in production on Vercel
   - What's unclear: Is deployed app required, or can we test locally?
   - Recommendation: Test locally with manual POST; production cron verifies schedule works

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/email/client.ts`, `src/app/api/cron/send-reminders/route.ts`
- Existing database schema: `src/lib/db/schema.ts` (reminder_logs table)
- [Resend Test Email Addresses](https://resend.com/docs/knowledge-base/what-email-addresses-to-use-for-testing)
- [Playwright API Testing](https://playwright.dev/docs/api-testing)

### Secondary (MEDIUM confidence)
- [Resend Retrieve Email API](https://resend.com/docs/api-reference/emails/retrieve-email)
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)

### Tertiary (LOW confidence)
- None - all findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and configured
- Architecture: HIGH - Complete implementation exists in codebase
- Pitfalls: HIGH - Derived from examining actual implementation logic

**Research date:** 2026-01-30
**Valid until:** 60 days (stable system, minimal API changes expected)
