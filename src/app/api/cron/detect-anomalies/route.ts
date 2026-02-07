import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, alerts } from "@/lib/db/schema";
import { eq, and, isNull, lt, gte } from "drizzle-orm";
import { subDays, startOfDay } from "date-fns";
import { detectMissedRenewal } from "@/lib/utils/anomaly-detection";

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
    missedRenewals: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // NOTE: Price increase detection happens on subscription update,
    // not in this cron job. This cron focuses on missed renewals only.
    // Price changes are detected immediately when user edits subscription amount.

    // === MISSED RENEWAL DETECTION ===
    // Find active subscriptions where renewal date has passed
    const now = new Date();
    const threeDaysAgo = subDays(startOfDay(now), 3);

    // Get all active subscriptions with overdue renewals
    const overdueSubscriptions = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.status, "active"),
        isNull(subscriptions.deletedAt),
        isNull(subscriptions.mergedAt),
        lt(subscriptions.nextRenewalDate, threeDaysAgo)
      ),
      columns: {
        id: true,
        userId: true,
        name: true,
        nextRenewalDate: true,
        updatedAt: true,
      },
    });

    for (const sub of overdueSubscriptions) {
      const missedResult = detectMissedRenewal(
        new Date(sub.nextRenewalDate),
        new Date(sub.updatedAt),
        now
      );

      if (!missedResult.isMissed) {
        results.skipped++;
        continue;
      }

      // Check if we already created an alert for this subscription's missed renewal
      const existingAlert = await db.query.alerts.findFirst({
        where: and(
          eq(alerts.subscriptionId, sub.id),
          eq(alerts.type, "missed_renewal"),
          isNull(alerts.dismissedAt),
          // Only check alerts from last 30 days to allow re-alerting for long-overdue subs
          gte(alerts.createdAt, subDays(now, 30))
        ),
      });

      if (existingAlert) {
        results.skipped++;
        continue;
      }

      try {
        await db.insert(alerts).values({
          userId: sub.userId,
          subscriptionId: sub.id,
          type: "missed_renewal",
          metadata: {
            expectedDate: sub.nextRenewalDate.toISOString(),
            subscriptionName: sub.name,
          },
        });
        results.missedRenewals++;
      } catch (error) {
        console.error(
          `Failed to create alert for subscription ${sub.id}:`,
          error
        );
        results.errors.push(`Failed to create alert for ${sub.name}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[detect-anomalies] Completed in ${duration}ms:`, results);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
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

// Also handle POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}
