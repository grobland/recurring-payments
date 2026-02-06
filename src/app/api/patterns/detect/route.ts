import { NextResponse } from "next/server";
import { sql, eq, isNull, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, recurringPatterns, categories } from "@/lib/db/schema";
import { calculatePatternConfidence, isDisplayableConfidence } from "@/lib/utils/pattern-detection";
import { calculateSimilarity, type SubscriptionRecord } from "@/lib/utils/similarity";
import { guessCategory } from "@/lib/utils/category-guesser";

/**
 * POST /api/patterns/detect
 * Run pattern detection query and store/update patterns in database.
 * Typically called after PDF import or on schedule.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Get detection window (default 12 months)
    const body = await request.json().catch(() => ({}));
    const monthsBack = Math.min(24, Math.max(1, body.monthsBack ?? 12));
    const windowStart = new Date();
    windowStart.setMonth(windowStart.getMonth() - monthsBack);
    const windowStartStr = windowStart.toISOString();

    // Run detection query with window functions
    // This query finds recurring charges by grouping by merchant name + currency
    // and calculating intervals between charges using LAG
    const detectionQuery = sql`
      WITH merchant_transactions AS (
        SELECT
          s.name as merchant_name,
          s.amount::numeric as amount,
          s.currency,
          s.created_at as charge_date,
          LAG(s.created_at) OVER (
            PARTITION BY LOWER(s.name), s.currency
            ORDER BY s.created_at
          ) as prev_charge_date
        FROM ${subscriptions} s
        WHERE s.user_id = ${userId}
          AND s.created_at >= ${windowStartStr}
          AND s.import_audit_id IS NOT NULL
          AND s.deleted_at IS NULL
          AND s.merged_at IS NULL
      ),
      patterns_with_intervals AS (
        SELECT
          merchant_name,
          currency,
          COUNT(*) as occurrence_count,
          ARRAY_AGG(charge_date::text ORDER BY charge_date) as charge_dates,
          ARRAY_AGG(amount ORDER BY charge_date) as amounts,
          AVG(amount)::numeric as avg_amount,
          COALESCE(STDDEV(amount), 0)::numeric as amount_stddev,
          AVG(
            EXTRACT(EPOCH FROM (charge_date - prev_charge_date)) / 86400
          )::integer as avg_interval_days,
          COALESCE(STDDEV(
            EXTRACT(EPOCH FROM (charge_date - prev_charge_date)) / 86400
          ), 0)::integer as interval_stddev
        FROM merchant_transactions
        WHERE prev_charge_date IS NOT NULL
        GROUP BY merchant_name, currency
        HAVING COUNT(*) >= 2
      )
      SELECT * FROM patterns_with_intervals;
    `;

    interface PatternRow {
      merchant_name: string;
      currency: string;
      occurrence_count: string;
      charge_dates: string[];
      amounts: string[];
      avg_amount: string;
      amount_stddev: string;
      avg_interval_days: string | null;
      interval_stddev: string | null;
    }

    const result = await db.execute(detectionQuery);
    const rawPatterns = result as unknown as PatternRow[];

    // Get existing subscriptions for duplicate filtering
    const existingSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          isNull(subscriptions.deletedAt),
          isNull(subscriptions.mergedAt)
        )
      );

    // Get categories for guessing
    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId));
    const defaultCategories = await db
      .select()
      .from(categories)
      .where(isNull(categories.userId));
    const allCategories = [...defaultCategories, ...userCategories];

    // Process patterns
    let stored = 0;
    let skipped = 0;
    let filtered = 0;

    for (const row of rawPatterns) {
      const pattern = {
        merchantName: row.merchant_name,
        currency: row.currency,
        occurrenceCount: parseInt(row.occurrence_count),
        chargeDates: row.charge_dates.map((d: string) => new Date(d)),
        amounts: row.amounts.map((a: string) => parseFloat(a)),
        avgAmount: parseFloat(row.avg_amount),
        amountStddev: parseFloat(row.amount_stddev || "0"),
        avgIntervalDays: parseInt(row.avg_interval_days || "0"),
        intervalStddev: parseInt(row.interval_stddev || "0"),
      };

      // Calculate confidence
      const confidence = calculatePatternConfidence(pattern);

      // Skip low confidence patterns
      if (!isDisplayableConfidence(confidence.score)) {
        skipped++;
        continue;
      }

      // Check if pattern matches existing subscription (duplicate filter)
      const patternRecord: SubscriptionRecord = {
        name: pattern.merchantName,
        amount: pattern.avgAmount,
        currency: pattern.currency,
        frequency: confidence.frequency ?? "monthly",
      };

      const matchesExisting = existingSubscriptions.some((sub) => {
        const subRecord: SubscriptionRecord = {
          name: sub.name,
          amount: parseFloat(sub.amount),
          currency: sub.currency,
          frequency: sub.frequency,
        };
        const similarity = calculateSimilarity(patternRecord, subRecord);
        return similarity.score >= 70;
      });

      if (matchesExisting) {
        filtered++;
        continue;
      }

      // Guess category
      const suggestedCategoryId = guessCategory(pattern.merchantName, allCategories);

      // Upsert pattern (update if exists, insert if new)
      const existing = await db
        .select()
        .from(recurringPatterns)
        .where(
          and(
            eq(recurringPatterns.userId, userId),
            eq(recurringPatterns.merchantName, pattern.merchantName),
            eq(recurringPatterns.currency, pattern.currency)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing pattern
        await db
          .update(recurringPatterns)
          .set({
            occurrenceCount: pattern.occurrenceCount,
            avgAmount: pattern.avgAmount.toFixed(2),
            amountStddev: pattern.amountStddev.toFixed(2),
            avgIntervalDays: pattern.avgIntervalDays,
            intervalStddev: pattern.intervalStddev,
            detectedFrequency: confidence.frequency,
            chargeDates: pattern.chargeDates.map((d: Date) => d.toISOString()),
            amounts: pattern.amounts,
            confidenceScore: confidence.score,
            updatedAt: new Date(),
          })
          .where(eq(recurringPatterns.id, existing[0].id));
      } else {
        // Insert new pattern
        await db.insert(recurringPatterns).values({
          userId,
          merchantName: pattern.merchantName,
          currency: pattern.currency,
          occurrenceCount: pattern.occurrenceCount,
          avgAmount: pattern.avgAmount.toFixed(2),
          amountStddev: pattern.amountStddev.toFixed(2),
          avgIntervalDays: pattern.avgIntervalDays,
          intervalStddev: pattern.intervalStddev,
          detectedFrequency: confidence.frequency,
          chargeDates: pattern.chargeDates.map((d: Date) => d.toISOString()),
          amounts: pattern.amounts,
          confidenceScore: confidence.score,
        });
      }
      stored++;
    }

    return NextResponse.json({
      success: true,
      patternsFound: rawPatterns.length,
      stored,
      skipped,
      filtered,
    });
  } catch (error) {
    console.error("Pattern detection error:", error);
    return NextResponse.json(
      { error: "Failed to detect patterns" },
      { status: 500 }
    );
  }
}
