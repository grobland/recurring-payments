/**
 * Monthly Forecast API Endpoint
 *
 * GET /api/forecast/monthly?months=6
 *
 * Returns monthly spending projections with expanding confidence intervals
 * based on known subscription renewals and historical volatility.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { addMonths, format, subMonths, startOfMonth } from "date-fns";
import { z } from "zod";
import { getExchangeRates, convertCurrency } from "@/lib/fx/rates";
import {
  calculateVolatility,
  addConfidenceIntervals,
  roundCurrency,
} from "@/lib/utils/forecast";
import type { MonthlyForecastResponse, MonthlyForecast } from "@/types/forecast";

// Query parameter validation
const querySchema = z.object({
  months: z.coerce.number().int().min(1).max(12).default(6),
});

// Type for raw MV query result
interface HistoricalMVRow {
  month_start: Date;
  total: string;
}

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

    const { months } = parseResult.data;
    const today = new Date();
    const forecastEnd = addMonths(today, months);

    // Step 1: Get user's display currency
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { displayCurrency: true },
    });
    const displayCurrency = user?.displayCurrency ?? "USD";

    // Get exchange rates
    const rates = await getExchangeRates();

    // Step 2: Get active subscriptions
    const activeSubs = await db
      .select({
        id: subscriptions.id,
        name: subscriptions.name,
        amount: subscriptions.amount,
        currency: subscriptions.currency,
        frequency: subscriptions.frequency,
        nextRenewalDate: subscriptions.nextRenewalDate,
        normalizedMonthlyAmount: subscriptions.normalizedMonthlyAmount,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, session.user.id),
          eq(subscriptions.status, "active")
        )
      );

    // Step 3: Project renewals across forecast window
    const monthlyForecasts: Record<string, number> = {};

    for (const sub of activeSubs) {
      let renewalDate = new Date(sub.nextRenewalDate);
      const incrementMonths = sub.frequency === "monthly" ? 1 : 12;

      // Convert subscription amount to display currency
      const convertedAmount = convertCurrency(
        parseFloat(sub.normalizedMonthlyAmount),
        sub.currency,
        displayCurrency,
        rates
      );

      // Project renewals until forecast end
      while (renewalDate <= forecastEnd) {
        if (renewalDate >= today) {
          const monthKey = format(renewalDate, "yyyy-MM");
          monthlyForecasts[monthKey] =
            (monthlyForecasts[monthKey] || 0) + convertedAmount;
        }
        renewalDate = addMonths(renewalDate, incrementMonths);
      }
    }

    // Step 4: Get historical data from MV for volatility calculation
    const historicalStart = subMonths(startOfMonth(today), 12);
    const historicalEnd = startOfMonth(today);

    const historicalResult = await db.execute(sql`
      SELECT
        DATE_TRUNC('month', month) as month_start,
        SUM(normalized_monthly_amount) as total
      FROM user_analytics_mv
      WHERE user_id = ${session.user.id}
        AND month >= ${historicalStart.toISOString()}
        AND month < ${historicalEnd.toISOString()}
      GROUP BY DATE_TRUNC('month', month)
      ORDER BY month_start
    `);

    const historicalRows = historicalResult as unknown as HistoricalMVRow[];

    // Convert historical data to display currency
    const historicalMonthly: number[] = historicalRows.map((row) =>
      parseFloat(row.total)
    );

    // Step 5: Calculate volatility (coefficient of variation)
    const cv = calculateVolatility(historicalMonthly);

    // Step 6: Build forecast array with expanding confidence intervals
    const forecasts: MonthlyForecast[] = [];

    // Generate forecasts for each month in the window
    for (let i = 0; i < months; i++) {
      const monthDate = addMonths(today, i);
      const monthKey = format(monthDate, "yyyy-MM");
      const forecast = monthlyForecasts[monthKey] || 0;
      const monthsAhead = i + 1; // 1-indexed for sqrt scaling

      // Add confidence intervals that widen over time
      // CI uses volatility (cv) and scales by sqrt(monthsAhead) for fan effect
      const ci = addConfidenceIntervals(forecast, cv, monthsAhead);

      forecasts.push({
        month: monthKey,
        forecast: roundCurrency(forecast),
        lower80: roundCurrency(ci.lower80),
        upper80: roundCurrency(ci.upper80),
        lower95: roundCurrency(ci.lower95),
        upper95: roundCurrency(ci.upper95),
      });
    }

    // Build response
    const response: MonthlyForecastResponse = {
      forecasts,
      displayCurrency,
      metadata: {
        historicalMonths: historicalMonthly.length,
        coefficientOfVariation: roundCurrency(cv),
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Monthly forecast API error:", error);
    return NextResponse.json(
      { error: "Failed to generate forecast" },
      { status: 500 }
    );
  }
}
