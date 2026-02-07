/**
 * Annual Forecast API Endpoint
 *
 * GET /api/forecast/annual
 *
 * Returns 12-month spending projection with confidence intervals.
 * Annual standard deviation scales by sqrt(12) for proper uncertainty propagation.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { addMonths, format, subMonths, startOfMonth } from "date-fns";
import { getExchangeRates, convertCurrency } from "@/lib/fx/rates";
import {
  calculateVolatility,
  calculateStdDev,
  addConfidenceIntervals,
  CONFIDENCE_LEVELS,
  roundCurrency,
} from "@/lib/utils/forecast";
import type {
  AnnualForecastResponse,
  MonthlyForecast,
} from "@/types/forecast";

// Type for raw MV query result
interface HistoricalMVRow {
  month_start: Date;
  total: string;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const forecastEnd = addMonths(today, 12);

    // Step 1: Get user's display currency
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { displayCurrency: true },
    });
    const displayCurrency = user?.displayCurrency ?? "USD";

    // Get exchange rates
    const rates = await getExchangeRates();

    // Step 2: Get active subscriptions and calculate current monthly run rate
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

    // Calculate current monthly spending (sum of all normalized monthly amounts)
    let currentMonthlyRate = 0;
    for (const sub of activeSubs) {
      const convertedAmount = convertCurrency(
        parseFloat(sub.normalizedMonthlyAmount),
        sub.currency,
        displayCurrency,
        rates
      );
      currentMonthlyRate += convertedAmount;
    }

    // Step 3: Get historical data from MV for volatility calculation
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
    const historicalMonthly: number[] = historicalRows.map((row) =>
      parseFloat(row.total)
    );

    // Step 4: Calculate volatility and standard deviation
    const cv = calculateVolatility(historicalMonthly);
    const monthlyStdDev = calculateStdDev(historicalMonthly);

    // Annual stdDev scales by sqrt(12) for 12 independent months
    const annualStdDev = monthlyStdDev * Math.sqrt(12);

    // Step 5: Calculate annual forecast with confidence intervals
    const annualForecast = currentMonthlyRate * 12;

    // Annual CI uses the scaled annual stdDev directly (no further scaling)
    const annualCI = {
      lower80: Math.max(
        0,
        annualForecast - CONFIDENCE_LEVELS[80] * annualStdDev
      ),
      upper80: annualForecast + CONFIDENCE_LEVELS[80] * annualStdDev,
      lower95: Math.max(
        0,
        annualForecast - CONFIDENCE_LEVELS[95] * annualStdDev
      ),
      upper95: annualForecast + CONFIDENCE_LEVELS[95] * annualStdDev,
    };

    // Step 6: Generate 12-month projections with expanding CI bands
    const monthlyProjections: MonthlyForecast[] = [];

    for (let i = 0; i < 12; i++) {
      const monthDate = addMonths(today, i);
      const monthKey = format(monthDate, "yyyy-MM");
      const monthsAhead = i + 1; // 1-indexed for sqrt scaling

      // Use current monthly rate as base forecast for each month
      const monthForecast = currentMonthlyRate;

      // Add confidence intervals that widen over time
      const ci = addConfidenceIntervals(monthForecast, cv, monthsAhead);

      monthlyProjections.push({
        month: monthKey,
        forecast: roundCurrency(monthForecast),
        lower80: roundCurrency(ci.lower80),
        upper80: roundCurrency(ci.upper80),
        lower95: roundCurrency(ci.lower95),
        upper95: roundCurrency(ci.upper95),
      });
    }

    // Build response
    const response: AnnualForecastResponse = {
      forecast: roundCurrency(annualForecast),
      lower80: roundCurrency(annualCI.lower80),
      upper80: roundCurrency(annualCI.upper80),
      lower95: roundCurrency(annualCI.lower95),
      upper95: roundCurrency(annualCI.upper95),
      monthlyProjections,
      displayCurrency,
      metadata: {
        historicalMonths: historicalMonthly.length,
        coefficientOfVariation: roundCurrency(cv),
        monthlyStdDev: roundCurrency(monthlyStdDev),
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Annual forecast API error:", error);
    return NextResponse.json(
      { error: "Failed to generate forecast" },
      { status: 500 }
    );
  }
}
