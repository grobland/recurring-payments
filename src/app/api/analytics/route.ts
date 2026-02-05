import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, fxRatesCache } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getExchangeRates, convertCurrency } from "@/lib/fx/rates";
import type {
  AnalyticsResponse,
  AnalyticsPeriod,
  CategoryBreakdown,
  CurrencyBreakdown,
} from "@/types/analytics";

// Query param validation schema
const analyticsParamsSchema = z.object({
  period: z.enum(["month", "year", "quarter"]).default("month"),
  year: z.coerce.number().min(2020).max(2100).optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  quarter: z.coerce.number().min(1).max(4).optional(),
});

// Type for raw materialized view row
interface AnalyticsMVRow {
  user_id: string;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  month: Date;
  currency: string;
  subscription_count: number;
  total_amount: string;
  normalized_monthly_amount: string;
}

/**
 * Calculate date range for the given period
 */
function getDateRange(
  period: AnalyticsPeriod,
  year: number,
  month?: number,
  quarter?: number
): { start: Date; end: Date } {
  switch (period) {
    case "month": {
      const m = month ?? new Date().getMonth() + 1;
      const start = new Date(Date.UTC(year, m - 1, 1));
      const end = new Date(Date.UTC(year, m, 1));
      return { start, end };
    }
    case "quarter": {
      const q = quarter ?? Math.ceil((new Date().getMonth() + 1) / 3);
      const startMonth = (q - 1) * 3;
      const start = new Date(Date.UTC(year, startMonth, 1));
      const end = new Date(Date.UTC(year, startMonth + 3, 1));
      return { start, end };
    }
    case "year": {
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year + 1, 0, 1));
      return { start, end };
    }
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Validate and parse params
    const parseResult = analyticsParamsSchema.safeParse(params);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { period, month, quarter } = parseResult.data;
    const year = parseResult.data.year ?? new Date().getFullYear();

    // Get date range for query
    const { start, end } = getDateRange(period, year, month, quarter);

    // Query the materialized view
    const result = await db.execute(sql`
      SELECT
        user_id,
        category_id,
        category_name,
        category_color,
        category_icon,
        month,
        currency,
        subscription_count,
        total_amount,
        normalized_monthly_amount
      FROM user_analytics_mv
      WHERE user_id = ${session.user.id}
        AND month >= ${start.toISOString()}
        AND month < ${end.toISOString()}
    `);
    const rows = result as unknown as AnalyticsMVRow[];

    // Get user's display currency
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { displayCurrency: true },
    });
    const displayCurrency = user?.displayCurrency ?? "USD";

    // Get exchange rates
    const rates = await getExchangeRates();

    // Get rate timestamp from cache
    const rateCache = await db.query.fxRatesCache.findFirst({
      orderBy: [desc(fxRatesCache.fetchedAt)],
      columns: { fetchedAt: true },
    });
    const rateTimestamp = rateCache?.fetchedAt?.toISOString() ?? new Date().toISOString();

    // Aggregate by category
    const categoryMap = new Map<
      string | null,
      {
        id: string | null;
        name: string;
        color: string;
        icon: string;
        amount: number;
        count: number;
      }
    >();

    // Track currency breakdown
    const currencyMap = new Map<string, number>();

    // Track unique subscriptions for total count
    let totalSubscriptionCount = 0;
    let totalMonthlyConverted = 0;

    for (const row of rows) {
      const catKey = row.category_id;
      const amount = parseFloat(row.normalized_monthly_amount);
      const originalAmount = parseFloat(row.total_amount);
      const count = row.subscription_count;

      // Convert to display currency
      const convertedAmount = convertCurrency(
        amount,
        row.currency,
        displayCurrency,
        rates
      );

      totalMonthlyConverted += convertedAmount;
      totalSubscriptionCount += count;

      // Accumulate by category
      const existing = categoryMap.get(catKey);
      if (existing) {
        existing.amount += convertedAmount;
        existing.count += count;
      } else {
        categoryMap.set(catKey, {
          id: row.category_id,
          name: row.category_name ?? "Uncategorized",
          color: row.category_color ?? "#6b7280",
          icon: row.category_icon ?? "circle",
          amount: convertedAmount,
          count,
        });
      }

      // Accumulate by currency
      const existingCurrency = currencyMap.get(row.currency) ?? 0;
      currencyMap.set(row.currency, existingCurrency + originalAmount);
    }

    // Build category breakdown with percentages
    const categories: CategoryBreakdown[] = Array.from(categoryMap.values())
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        amount: Math.round(cat.amount * 100) / 100,
        count: cat.count,
        percentage:
          totalMonthlyConverted > 0
            ? Math.round((cat.amount / totalMonthlyConverted) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Build currency breakdown
    const currencyBreakdown: CurrencyBreakdown[] = Array.from(
      currencyMap.entries()
    )
      .map(([currency, amount]) => ({
        currency,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Build response
    const response: AnalyticsResponse = {
      period,
      year,
      ...(period === "month" && { month: month ?? new Date().getMonth() + 1 }),
      ...(period === "quarter" && {
        quarter: quarter ?? Math.ceil((new Date().getMonth() + 1) / 3),
      }),
      totalMonthly: Math.round(totalMonthlyConverted * 100) / 100,
      totalYearly: Math.round(totalMonthlyConverted * 12 * 100) / 100,
      subscriptionCount: totalSubscriptionCount,
      categoryCount: categories.length,
      displayCurrency,
      categories,
      currencyBreakdown,
      rateTimestamp,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
