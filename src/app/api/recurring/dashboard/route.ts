import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recurringMasters, reviewQueueItems, recurringEvents } from "@/lib/db/schema";
import { and, eq, isNotNull, isNull, gte, lte, desc, asc, sql } from "drizzle-orm";

/**
 * GET /api/recurring/dashboard
 * Returns aggregate summary data for the recurring payments dashboard.
 * Uses efficient SQL aggregate query + two focused selects — no N+1.
 * Response is cache-friendly (UI can cache 60s).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Single aggregate query for counts and totals
    const [summary] = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM recurring_masters WHERE user_id = ${userId} AND status = 'active') as active_count,
        (SELECT COALESCE(SUM(expected_amount::numeric), 0) FROM recurring_masters WHERE user_id = ${userId} AND status = 'active') as monthly_total,
        (SELECT COUNT(*) FROM recurring_masters WHERE user_id = ${userId} AND status = 'active' AND next_expected_date IS NOT NULL AND next_expected_date <= ${sevenDaysFromNow} AND next_expected_date >= ${now}) as upcoming_count,
        (SELECT COUNT(*) FROM review_queue_items WHERE user_id = ${userId} AND resolved_at IS NULL) as needs_review_count
    `);

    // Upcoming payments within 7 days
    const upcomingPayments = await db
      .select({
        id: recurringMasters.id,
        name: recurringMasters.name,
        expectedAmount: recurringMasters.expectedAmount,
        currency: recurringMasters.currency,
        nextExpectedDate: recurringMasters.nextExpectedDate,
        recurringKind: recurringMasters.recurringKind,
      })
      .from(recurringMasters)
      .where(
        and(
          eq(recurringMasters.userId, userId),
          eq(recurringMasters.status, "active"),
          isNotNull(recurringMasters.nextExpectedDate),
          gte(recurringMasters.nextExpectedDate, now),
          lte(recurringMasters.nextExpectedDate, sevenDaysFromNow)
        )
      )
      .orderBy(asc(recurringMasters.nextExpectedDate))
      .limit(10);

    // Recent amount changes (last 5 events)
    const amountChanges = await db
      .select({
        id: recurringEvents.id,
        recurringMasterId: recurringEvents.recurringMasterId,
        masterName: recurringMasters.name,
        eventType: recurringEvents.eventType,
        metadata: recurringEvents.metadata,
        createdAt: recurringEvents.createdAt,
      })
      .from(recurringEvents)
      .innerJoin(recurringMasters, eq(recurringEvents.recurringMasterId, recurringMasters.id))
      .where(
        and(
          eq(recurringEvents.userId, userId),
          eq(recurringEvents.eventType, "amount_changed")
        )
      )
      .orderBy(desc(recurringEvents.createdAt))
      .limit(5);

    // Also fetch needs_review masters for quick visibility
    const needsReviewItems = await db
      .select({
        id: reviewQueueItems.id,
        itemType: reviewQueueItems.itemType,
        confidence: reviewQueueItems.confidence,
        suggestedAction: reviewQueueItems.suggestedAction,
        createdAt: reviewQueueItems.createdAt,
      })
      .from(reviewQueueItems)
      .where(
        and(
          eq(reviewQueueItems.userId, userId),
          isNull(reviewQueueItems.resolvedAt)
        )
      )
      .orderBy(desc(reviewQueueItems.confidence))
      .limit(5);

    const activeCount = Number(summary.active_count ?? 0);
    const monthlyTotal = Number(summary.monthly_total ?? 0);
    const upcomingCount = Number(summary.upcoming_count ?? 0);
    const needsReviewCount = Number(summary.needs_review_count ?? 0);

    return NextResponse.json({
      data: {
        activeCount,
        monthlyTotal,
        upcomingCount,
        needsReviewCount,
        upcomingPayments: upcomingPayments.map((p) => ({
          ...p,
          nextExpectedDate: p.nextExpectedDate?.toISOString() ?? null,
        })),
        amountChanges: amountChanges.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })),
        needsReviewItems: needsReviewItems.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Get recurring dashboard error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
