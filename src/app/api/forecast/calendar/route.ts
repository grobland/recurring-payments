import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, categories, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { addDays, addMonths } from "date-fns";
import type {
  UpcomingCharge,
  CalendarSummary,
  CalendarResponse,
} from "@/types/forecast";

/**
 * Query parameter validation schema.
 * days: Number of days to forecast (30, 60, or 90)
 */
const querySchema = z.object({
  days: z.enum(["30", "60", "90"]).default("30"),
});

/**
 * GET /api/forecast/calendar
 *
 * Returns upcoming subscription charges for the next N days.
 * Projects renewals based on subscription frequency (monthly/yearly).
 *
 * Query params:
 *   - days: "30" | "60" | "90" (default "30")
 *
 * Response: CalendarResponse
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Validate query params
    const parseResult = querySchema.safeParse(params);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const days = parseInt(parseResult.data.days, 10);

    // Get user's display currency
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { displayCurrency: true },
    });
    const displayCurrency = user?.displayCurrency ?? "USD";

    // Query active subscriptions with category info
    const activeSubs = await db
      .select({
        id: subscriptions.id,
        name: subscriptions.name,
        amount: subscriptions.amount,
        currency: subscriptions.currency,
        frequency: subscriptions.frequency,
        nextRenewalDate: subscriptions.nextRenewalDate,
        categoryId: subscriptions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(subscriptions)
      .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
      .where(
        and(
          eq(subscriptions.userId, session.user.id),
          eq(subscriptions.status, "active"),
          isNull(subscriptions.deletedAt),
          isNull(subscriptions.mergedAt)
        )
      );

    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const endDate = addDays(today, days);

    // Project renewals within the date range
    const upcomingCharges: UpcomingCharge[] = [];

    for (const sub of activeSubs) {
      let renewalDate = new Date(sub.nextRenewalDate);
      renewalDate.setHours(0, 0, 0, 0); // Normalize to start of day

      const incrementMonths = sub.frequency === "monthly" ? 1 : 12;

      // Project forward from nextRenewalDate
      while (renewalDate <= endDate) {
        if (renewalDate >= today) {
          upcomingCharges.push({
            date: renewalDate.toISOString(),
            subscriptionId: sub.id,
            subscriptionName: sub.name,
            amount: parseFloat(sub.amount),
            currency: sub.currency,
            categoryId: sub.categoryId,
            categoryName: sub.categoryName ?? "Uncategorized",
            categoryColor: sub.categoryColor ?? "#6b7280",
          });
        }
        renewalDate = addMonths(renewalDate, incrementMonths);
      }
    }

    // Sort chronologically by date
    upcomingCharges.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate summary
    const uniqueSubscriptionIds = new Set(
      upcomingCharges.map((c) => c.subscriptionId)
    );

    const summary: CalendarSummary = {
      totalAmount: upcomingCharges.reduce((sum, c) => sum + c.amount, 0),
      chargeCount: upcomingCharges.length,
      uniqueSubscriptions: uniqueSubscriptionIds.size,
      startDate: today.toISOString(),
      endDate: endDate.toISOString(),
    };

    // Build response
    const response: CalendarResponse = {
      charges: upcomingCharges,
      summary,
      displayCurrency,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Forecast calendar API error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
