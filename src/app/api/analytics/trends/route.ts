import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, fxRatesCache } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getExchangeRates, convertCurrency } from "@/lib/fx/rates";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import type {
  TrendsResponse,
  MonthlyTrend,
  CategoryTrend,
  YearComparison,
  MoMChange,
} from "@/types/analytics";

// Query param validation schema
const trendsParamsSchema = z.object({
  months: z.coerce.number().min(1).max(24).default(12),
});

// Type for raw materialized view row
interface TrendsMVRow {
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  month_start: Date;
  currency: string;
  amount: string;
}

/**
 * Calculate month-over-month change
 */
function calculateMoMChange(current: number, previous: number): MoMChange {
  if (previous === 0) {
    return {
      current,
      previous,
      absolute: current,
      percentage: current > 0 ? 100 : 0,
      direction: current > 0 ? "up" : "neutral",
    };
  }

  const absolute = current - previous;
  const percentage = ((current - previous) / previous) * 100;
  // Per CONTEXT.md: direction is 'up' if percentage > 0.5, 'down' if < -0.5
  const direction: MoMChange["direction"] =
    percentage > 0.5 ? "up" : percentage < -0.5 ? "down" : "neutral";

  return { current, previous, absolute, percentage, direction };
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
    const parseResult = trendsParamsSchema.safeParse(params);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { months } = parseResult.data;

    // Calculate date range
    const now = new Date();
    const endDate = endOfMonth(now);
    const startDate = startOfMonth(subMonths(now, months - 1));

    // Query the materialized view grouped by month
    const result = await db.execute(sql`
      SELECT
        category_id,
        category_name,
        category_color,
        date_trunc('month', month) as month_start,
        currency,
        sum(normalized_monthly_amount) as amount
      FROM user_analytics_mv
      WHERE user_id = ${session.user.id}
        AND month >= ${startDate.toISOString()}
        AND month < ${endDate.toISOString()}
      GROUP BY category_id, category_name, category_color, date_trunc('month', month), currency
      ORDER BY month_start
    `);
    const rows = result as unknown as TrendsMVRow[];

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
    const rateTimestamp =
      rateCache?.fetchedAt?.toISOString() ?? new Date().toISOString();

    // Build month-by-month aggregation
    const monthlyMap = new Map<
      string,
      { total: number; wasConverted: boolean }
    >();

    // Build category-by-month aggregation
    const categoryMonthlyMap = new Map<
      string | null,
      {
        name: string;
        color: string;
        months: Map<string, { amount: number; wasConverted: boolean }>;
      }
    >();

    for (const row of rows) {
      const monthDate = new Date(row.month_start);
      const monthKey = format(monthDate, "yyyy-MM");
      const amount = parseFloat(row.amount);
      const needsConversion = row.currency !== displayCurrency;

      // Convert to display currency
      const convertedAmount = convertCurrency(
        amount,
        row.currency,
        displayCurrency,
        rates
      );

      // Update monthly totals
      const existing = monthlyMap.get(monthKey) ?? {
        total: 0,
        wasConverted: false,
      };
      existing.total += convertedAmount;
      existing.wasConverted = existing.wasConverted || needsConversion;
      monthlyMap.set(monthKey, existing);

      // Update category totals
      const catKey = row.category_id;
      let catData = categoryMonthlyMap.get(catKey);
      if (!catData) {
        catData = {
          name: row.category_name ?? "Uncategorized",
          color: row.category_color ?? "#6b7280",
          months: new Map(),
        };
        categoryMonthlyMap.set(catKey, catData);
      }

      const catMonthData = catData.months.get(monthKey) ?? {
        amount: 0,
        wasConverted: false,
      };
      catMonthData.amount += convertedAmount;
      catMonthData.wasConverted = catMonthData.wasConverted || needsConversion;
      catData.months.set(monthKey, catMonthData);
    }

    // Build monthlyTrends array
    const monthlyTrends: MonthlyTrend[] = [];
    for (let i = 0; i < months; i++) {
      const monthDate = subMonths(now, months - 1 - i);
      const monthKey = format(monthDate, "yyyy-MM");
      const data = monthlyMap.get(monthKey);

      monthlyTrends.push({
        month: format(monthDate, "MMM"),
        year: monthDate.getFullYear(),
        amount: Math.round((data?.total ?? 0) * 100) / 100,
        wasConverted: data?.wasConverted ?? false,
      });
    }

    // Build categoryTrends array
    const categoryTrends: CategoryTrend[] = [];
    for (const [catId, catData] of categoryMonthlyMap.entries()) {
      const data: MonthlyTrend[] = [];
      for (let i = 0; i < months; i++) {
        const monthDate = subMonths(now, months - 1 - i);
        const monthKey = format(monthDate, "yyyy-MM");
        const monthData = catData.months.get(monthKey);

        data.push({
          month: format(monthDate, "MMM"),
          year: monthDate.getFullYear(),
          amount: Math.round((monthData?.amount ?? 0) * 100) / 100,
          wasConverted: monthData?.wasConverted ?? false,
        });
      }

      categoryTrends.push({
        categoryId: catId,
        categoryName: catData.name,
        categoryColor: catData.color,
        data,
      });
    }

    // Sort categoryTrends by total amount (highest first)
    categoryTrends.sort((a, b) => {
      const totalA = a.data.reduce((sum, d) => sum + d.amount, 0);
      const totalB = b.data.reduce((sum, d) => sum + d.amount, 0);
      return totalB - totalA;
    });

    // Build yearComparison (12 months of current year vs previous year)
    const currentYear = now.getFullYear();
    const yearComparison: YearComparison[] = [];

    // Query for year-over-year data (current year and previous year)
    const yoyStartDate = new Date(Date.UTC(currentYear - 1, 0, 1));
    const yoyEndDate = endOfMonth(now);

    const yoyResult = await db.execute(sql`
      SELECT
        date_trunc('month', month) as month_start,
        currency,
        sum(normalized_monthly_amount) as amount
      FROM user_analytics_mv
      WHERE user_id = ${session.user.id}
        AND month >= ${yoyStartDate.toISOString()}
        AND month < ${yoyEndDate.toISOString()}
      GROUP BY date_trunc('month', month), currency
      ORDER BY month_start
    `);
    const yoyRows = yoyResult as unknown as {
      month_start: Date;
      currency: string;
      amount: string;
    }[];

    // Aggregate by year-month
    const yoyMap = new Map<string, number>();
    for (const row of yoyRows) {
      const monthDate = new Date(row.month_start);
      const key = format(monthDate, "yyyy-MM");
      const amount = parseFloat(row.amount);
      const convertedAmount = convertCurrency(
        amount,
        row.currency,
        displayCurrency,
        rates
      );
      yoyMap.set(key, (yoyMap.get(key) ?? 0) + convertedAmount);
    }

    // Build comparison for each month (Jan-Dec or up to current month)
    const monthsToCompare = now.getMonth() + 1; // 1-12
    for (let m = 0; m < monthsToCompare; m++) {
      const currentKey = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
      const previousKey = `${currentYear - 1}-${String(m + 1).padStart(2, "0")}`;

      yearComparison.push({
        month: format(new Date(currentYear, m, 1), "MMM"),
        currentYear: Math.round((yoyMap.get(currentKey) ?? 0) * 100) / 100,
        previousYear: Math.round((yoyMap.get(previousKey) ?? 0) * 100) / 100,
      });
    }

    // Calculate MoM change (current month vs previous month)
    const currentMonthKey = format(now, "yyyy-MM");
    const prevMonthKey = format(subMonths(now, 1), "yyyy-MM");
    const currentMonthTotal = monthlyMap.get(currentMonthKey)?.total ?? 0;
    const prevMonthTotal = monthlyMap.get(prevMonthKey)?.total ?? 0;

    const momChange = calculateMoMChange(
      Math.round(currentMonthTotal * 100) / 100,
      Math.round(prevMonthTotal * 100) / 100
    );

    // Build response
    const response: TrendsResponse = {
      displayCurrency,
      monthlyTrends,
      categoryTrends,
      yearComparison,
      momChange,
      rateTimestamp,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Trends API error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
