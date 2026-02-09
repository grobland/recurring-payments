import { NextResponse } from "next/server";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { addMonths, addYears } from "date-fns";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, recurringPatterns, categories } from "@/lib/db/schema";
import { guessCategory } from "@/lib/utils/category-guesser";

/**
 * Request schema for bulk pattern operations
 */
const bulkPatternSchema = z.object({
  patternIds: z.array(z.string().uuid()).min(1, "At least one pattern ID is required"),
  action: z.enum(["accept", "dismiss"]),
});

/**
 * POST /api/patterns/bulk
 * Handle bulk accept or dismiss operations on multiple patterns.
 * Uses database transaction for atomicity.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const parsed = bulkPatternSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { patternIds, action } = parsed.data;

    if (action === "dismiss") {
      // Handle bulk dismiss
      const result = await db.transaction(async (tx) => {
        // Fetch patterns with FOR UPDATE lock to prevent race conditions
        const patterns = await tx
          .select()
          .from(recurringPatterns)
          .where(
            and(
              inArray(recurringPatterns.id, patternIds),
              eq(recurringPatterns.userId, userId),
              isNull(recurringPatterns.dismissedAt),
              isNull(recurringPatterns.acceptedAt)
            )
          )
          .for("update");

        if (patterns.length === 0) {
          return { dismissedCount: 0 };
        }

        const validPatternIds = patterns.map((p) => p.id);

        // Bulk update all patterns to dismissed
        await tx
          .update(recurringPatterns)
          .set({
            dismissedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(inArray(recurringPatterns.id, validPatternIds));

        return { dismissedCount: patterns.length };
      });

      if (result.dismissedCount === 0) {
        return NextResponse.json(
          { error: "No valid patterns found to dismiss" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        dismissedCount: result.dismissedCount,
      });
    }

    // Handle bulk accept
    const result = await db.transaction(async (tx) => {
      // Fetch patterns with FOR UPDATE lock to prevent race conditions
      const patterns = await tx
        .select()
        .from(recurringPatterns)
        .where(
          and(
            inArray(recurringPatterns.id, patternIds),
            eq(recurringPatterns.userId, userId),
            isNull(recurringPatterns.dismissedAt),
            isNull(recurringPatterns.acceptedAt)
          )
        )
        .for("update");

      if (patterns.length === 0) {
        return { acceptedCount: 0, subscriptionIds: [] as string[] };
      }

      // Get categories for guessing
      const userCategories = await tx
        .select()
        .from(categories)
        .where(eq(categories.userId, userId));
      const defaultCategories = await tx
        .select()
        .from(categories)
        .where(isNull(categories.userId));
      const allCategories = [...defaultCategories, ...userCategories];

      const subscriptionIds: string[] = [];

      // Process each pattern
      for (const pattern of patterns) {
        // Guess category
        const categoryId = guessCategory(pattern.merchantName, allCategories) ?? undefined;

        // Calculate next renewal date from most recent charge
        const chargeDates = (pattern.chargeDates as string[]).map((d: string) => new Date(d));
        const mostRecentCharge = chargeDates[chargeDates.length - 1];
        const frequency = pattern.detectedFrequency ?? "monthly";
        const nextRenewalDate =
          frequency === "yearly"
            ? addYears(mostRecentCharge, 1)
            : addMonths(mostRecentCharge, 1);

        // Calculate normalized monthly amount
        const amount = parseFloat(pattern.avgAmount);
        const normalizedMonthlyAmount = frequency === "yearly" ? amount / 12 : amount;

        // Create subscription
        const [newSubscription] = await tx
          .insert(subscriptions)
          .values({
            userId,
            name: pattern.merchantName,
            amount: amount.toFixed(2),
            currency: pattern.currency,
            frequency,
            normalizedMonthlyAmount: normalizedMonthlyAmount.toFixed(2),
            nextRenewalDate,
            lastRenewalDate: mostRecentCharge,
            categoryId,
            status: "active",
          })
          .returning();

        subscriptionIds.push(newSubscription.id);

        // Mark pattern as accepted
        await tx
          .update(recurringPatterns)
          .set({
            acceptedAt: new Date(),
            createdSubscriptionId: newSubscription.id,
            updatedAt: new Date(),
          })
          .where(eq(recurringPatterns.id, pattern.id));
      }

      return { acceptedCount: patterns.length, subscriptionIds };
    });

    if (result.acceptedCount === 0) {
      return NextResponse.json(
        { error: "No valid patterns found to accept" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      acceptedCount: result.acceptedCount,
      subscriptionIds: result.subscriptionIds,
    });
  } catch (error) {
    console.error("Bulk pattern operation error:", error);
    return NextResponse.json(
      { error: "Failed to process bulk operation" },
      { status: 500 }
    );
  }
}
