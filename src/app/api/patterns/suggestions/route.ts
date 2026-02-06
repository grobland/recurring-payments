import { NextResponse } from "next/server";
import { eq, and, isNull, gte, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recurringPatterns, categories } from "@/lib/db/schema";
import { guessCategory } from "@/lib/utils/category-guesser";
import { CONFIDENCE_THRESHOLDS } from "@/lib/utils/pattern-detection";

/**
 * GET /api/patterns/suggestions
 * Fetch active pattern suggestions (not dismissed, not accepted, confidence >= 70)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Fetch patterns that are:
    // - Not dismissed
    // - Not accepted
    // - Confidence >= 70
    const patterns = await db
      .select()
      .from(recurringPatterns)
      .where(
        and(
          eq(recurringPatterns.userId, userId),
          isNull(recurringPatterns.dismissedAt),
          isNull(recurringPatterns.acceptedAt),
          gte(recurringPatterns.confidenceScore, CONFIDENCE_THRESHOLDS.MIN_DISPLAY)
        )
      )
      .orderBy(desc(recurringPatterns.confidenceScore));

    // Get categories for suggesting
    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId));
    const defaultCategories = await db
      .select()
      .from(categories)
      .where(isNull(categories.userId));
    const allCategories = [...defaultCategories, ...userCategories];

    // Map to response format with suggested categories
    const suggestions = patterns.map((pattern) => ({
      id: pattern.id,
      merchantName: pattern.merchantName,
      currency: pattern.currency,
      avgAmount: parseFloat(pattern.avgAmount),
      occurrenceCount: pattern.occurrenceCount,
      confidenceScore: pattern.confidenceScore,
      detectedFrequency: pattern.detectedFrequency,
      chargeDates: pattern.chargeDates,
      amounts: pattern.amounts,
      avgIntervalDays: pattern.avgIntervalDays,
      suggestedCategoryId: guessCategory(pattern.merchantName, allCategories),
      detectedAt: pattern.detectedAt.toISOString(),
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Fetch suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
