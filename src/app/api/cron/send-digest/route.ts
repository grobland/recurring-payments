import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, subscriptions, alerts } from "@/lib/db/schema";
import { eq, and, isNull, gte, lte } from "drizzle-orm";
import { sendEmail } from "@/lib/email/client";
import { digestEmail } from "@/lib/email/templates/weekly-digest";
import { subDays, startOfWeek, endOfWeek, format } from "date-fns";
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
  const startTime = Date.now();

  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    sent: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();
    // Get the previous week's range (Mon-Sun)
    const weekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });

    // Get all users with email reminders enabled
    const usersToEmail = await db.query.users.findMany({
      where: eq(users.emailRemindersEnabled, true),
      columns: {
        id: true,
        email: true,
        name: true,
        displayCurrency: true,
        billingStatus: true,
        trialEndDate: true,
      },
    });

    for (const user of usersToEmail) {
      // Skip users without active subscription/trial
      const isActive =
        user.billingStatus === "active" ||
        (user.billingStatus === "trial" &&
          user.trialEndDate &&
          new Date(user.trialEndDate) > now);

      if (!isActive) {
        results.skipped++;
        continue;
      }

      try {
        // Get unacknowledged alerts from the past week
        const userAlerts = await db.query.alerts.findMany({
          where: and(
            eq(alerts.userId, user.id),
            isNull(alerts.dismissedAt),
            isNull(alerts.acknowledgedAt),
            gte(alerts.createdAt, weekStart),
            lte(alerts.createdAt, weekEnd)
          ),
          with: {
            subscription: {
              columns: {
                name: true,
              },
            },
          },
        });

        // Calculate weekly spending (subscriptions that renewed last week)
        const renewedSubscriptions = await db.query.subscriptions.findMany({
          where: and(
            eq(subscriptions.userId, user.id),
            eq(subscriptions.status, "active"),
            isNull(subscriptions.deletedAt),
            gte(subscriptions.lastRenewalDate, weekStart),
            lte(subscriptions.lastRenewalDate, weekEnd)
          ),
          columns: {
            amount: true,
            currency: true,
          },
        });

        // Sum up spending (simple sum, same currency assumption for now)
        const totalSpent = renewedSubscriptions.reduce(
          (sum, s) => sum + parseFloat(s.amount),
          0
        );

        // Format alerts for email
        const emailAlerts = userAlerts.map((alert) => {
          const subscriptionName =
            alert.subscription?.name ??
            alert.metadata?.subscriptionName ??
            "Unknown";

          let message: string;
          if (alert.type === "price_increase") {
            const { oldAmount, newAmount, currency } = alert.metadata ?? {};
            if (oldAmount !== undefined && newAmount !== undefined) {
              const formatter = new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: currency ?? "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              });
              message = `${formatter.format(oldAmount)} -> ${formatter.format(newAmount)}`;
            } else {
              message = "Price increased";
            }
          } else {
            const { expectedDate } = alert.metadata ?? {};
            if (expectedDate) {
              message = `Expected ${format(new Date(expectedDate), "MMM d")}`;
            } else {
              message = "Renewal missed";
            }
          }

          return {
            type: alert.type as "price_increase" | "missed_renewal",
            subscriptionName,
            message,
          };
        });

        // Generate and send email
        const emailData = digestEmail({
          userName: user.name ?? "",
          alerts: emailAlerts,
          weeklySpending: {
            total: formatCurrency(totalSpent, user.displayCurrency),
            renewalCount: renewedSubscriptions.length,
          },
        });

        await sendEmail({
          to: user.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });

        results.sent++;
      } catch (error) {
        console.error(`Failed to send digest to ${user.email}:`, error);
        results.errors.push(`Failed to send to ${user.email}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[send-digest] Completed in ${duration}ms:`, results);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      ...results,
    });
  } catch (error) {
    console.error("Digest cron job error:", error);
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

// Also handle POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}
