import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, subscriptions, reminderLogs } from "@/lib/db/schema";
import { eq, and, isNull, gte, lte, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/email/client";
import { reminderEmail } from "@/lib/email/templates/reminder";
import { trialEndingEmail } from "@/lib/email/templates/trial-ending";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not configured");
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    remindersProcessed: 0,
    remindersSent: 0,
    remindersFailed: 0,
    trialRemindersProcessed: 0,
    trialRemindersSent: 0,
    errors: [] as string[],
  };

  try {
    // === SUBSCRIPTION REMINDERS ===
    await processSubscriptionReminders(results);

    // === TRIAL ENDING REMINDERS ===
    await processTrialReminders(results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Cron job failed",
        details: error instanceof Error ? error.message : "Unknown error",
        ...results,
      },
      { status: 500 }
    );
  }
}

async function processSubscriptionReminders(results: {
  remindersProcessed: number;
  remindersSent: number;
  remindersFailed: number;
  errors: string[];
}) {
  // Get all users with email reminders enabled
  const usersWithReminders = await db.query.users.findMany({
    where: eq(users.emailRemindersEnabled, true),
    columns: {
      id: true,
      email: true,
      name: true,
      reminderDaysBefore: true,
      displayCurrency: true,
      billingStatus: true,
      trialEndDate: true,
    },
  });

  const now = new Date();

  for (const user of usersWithReminders) {
    // Skip users without active subscription/trial
    const isActive =
      user.billingStatus === "active" ||
      (user.billingStatus === "trial" &&
        user.trialEndDate &&
        new Date(user.trialEndDate) > now);

    if (!isActive) continue;

    const reminderDays = (user.reminderDaysBefore as number[]) ?? [7, 1];

    // Get subscriptions that need reminders
    for (const daysAhead of reminderDays) {
      const targetDate = addDays(now, daysAhead);
      const dayStart = startOfDay(targetDate);
      const dayEnd = endOfDay(targetDate);

      const subscriptionsToRemind = await db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active"),
          eq(subscriptions.reminderEnabled, true),
          isNull(subscriptions.deletedAt),
          gte(subscriptions.nextRenewalDate, dayStart),
          lte(subscriptions.nextRenewalDate, dayEnd)
        ),
        columns: {
          id: true,
          name: true,
          amount: true,
          currency: true,
          nextRenewalDate: true,
          skipNextReminder: true,
          reminderSnoozedUntil: true,
        },
      });

      // Filter out snoozed/skipped subscriptions
      const eligibleSubscriptions = subscriptionsToRemind.filter((sub) => {
        if (sub.skipNextReminder) return false;
        if (sub.reminderSnoozedUntil && new Date(sub.reminderSnoozedUntil) > now) {
          return false;
        }
        return true;
      });

      if (eligibleSubscriptions.length === 0) continue;

      // Check if we already sent a reminder for these subscriptions today
      const subscriptionIds = eligibleSubscriptions.map((s) => s.id);
      const existingLogs = await db.query.reminderLogs.findMany({
        where: and(
          inArray(reminderLogs.subscriptionId, subscriptionIds),
          eq(reminderLogs.status, "sent"),
          gte(reminderLogs.sentAt, startOfDay(now))
        ),
      });

      const alreadySentIds = new Set(existingLogs.map((l) => l.subscriptionId));
      const toSend = eligibleSubscriptions.filter(
        (s) => !alreadySentIds.has(s.id)
      );

      if (toSend.length === 0) continue;

      results.remindersProcessed += toSend.length;

      // Send combined email for all subscriptions renewing on the same day
      try {
        const emailData = reminderEmail({
          userName: user.name ?? "",
          subscriptions: toSend.map((sub) => ({
            name: sub.name,
            amount: formatCurrency(parseFloat(sub.amount), sub.currency),
            currency: sub.currency,
            renewalDate: format(new Date(sub.nextRenewalDate), "MMM d, yyyy"),
            daysUntil: daysAhead,
          })),
        });

        const result = await sendEmail({
          to: user.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });

        // Log successful sends
        for (const sub of toSend) {
          await db.insert(reminderLogs).values({
            subscriptionId: sub.id,
            userId: user.id,
            status: "sent",
            scheduledFor: new Date(sub.nextRenewalDate),
            sentAt: new Date(),
            emailTo: user.email,
            emailSubject: emailData.subject,
            resendMessageId: result?.id,
          });
        }

        results.remindersSent += toSend.length;
      } catch (error) {
        console.error(`Failed to send reminder to ${user.email}:`, error);
        results.remindersFailed += toSend.length;
        results.errors.push(`Failed to send to ${user.email}`);

        // Log failed sends
        for (const sub of toSend) {
          await db.insert(reminderLogs).values({
            subscriptionId: sub.id,
            userId: user.id,
            status: "failed",
            scheduledFor: new Date(sub.nextRenewalDate),
            emailTo: user.email,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }
  }
}

async function processTrialReminders(results: {
  trialRemindersProcessed: number;
  trialRemindersSent: number;
  errors: string[];
}) {
  const now = new Date();
  const trialReminderDays = [7, 3, 1, 0]; // Days before trial ends

  for (const daysAhead of trialReminderDays) {
    const targetDate = addDays(now, daysAhead);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Find users whose trial ends on the target date
    const trialUsers = await db.query.users.findMany({
      where: and(
        eq(users.billingStatus, "trial"),
        gte(users.trialEndDate, dayStart),
        lte(users.trialEndDate, dayEnd)
      ),
      columns: {
        id: true,
        email: true,
        name: true,
        displayCurrency: true,
      },
    });

    for (const user of trialUsers) {
      results.trialRemindersProcessed++;

      // Get user's subscription stats
      const userSubscriptions = await db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active"),
          isNull(subscriptions.deletedAt)
        ),
        columns: {
          normalizedMonthlyAmount: true,
        },
      });

      const subscriptionCount = userSubscriptions.length;
      const monthlySpend = userSubscriptions.reduce(
        (sum, s) => sum + parseFloat(s.normalizedMonthlyAmount),
        0
      );

      try {
        const emailData = trialEndingEmail({
          userName: user.name ?? "",
          daysLeft: daysAhead,
          subscriptionCount,
          monthlySpend: formatCurrency(monthlySpend, user.displayCurrency),
        });

        await sendEmail({
          to: user.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });

        results.trialRemindersSent++;
      } catch (error) {
        console.error(`Failed to send trial reminder to ${user.email}:`, error);
        results.errors.push(`Failed to send trial reminder to ${user.email}`);
      }
    }
  }
}

// Also handle POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}
