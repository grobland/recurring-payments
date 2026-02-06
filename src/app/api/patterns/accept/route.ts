import { NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { addMonths, addYears } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, recurringPatterns, categories } from "@/lib/db/schema";
import { acceptPatternSchema, undoAcceptSchema } from "@/lib/validations/patterns";
import { guessCategory } from "@/lib/utils/category-guesser";

/**
 * POST /api/patterns/accept
 * Accept a pattern suggestion and create a subscription.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const parsed = acceptPatternSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { patternId, name, categoryId, amount, frequency } = parsed.data;

    // Get pattern and verify ownership
    const [pattern] = await db
      .select()
      .from(recurringPatterns)
      .where(
        and(
          eq(recurringPatterns.id, patternId),
          eq(recurringPatterns.userId, userId),
          isNull(recurringPatterns.acceptedAt),
          isNull(recurringPatterns.dismissedAt)
        )
      )
      .limit(1);

    if (!pattern) {
      return NextResponse.json(
        { error: "Pattern not found or already processed" },
        { status: 404 }
      );
    }

    // Get categories for guessing if not provided
    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId) {
      const userCategories = await db
        .select()
        .from(categories)
        .where(eq(categories.userId, userId));
      const defaultCategories = await db
        .select()
        .from(categories)
        .where(isNull(categories.userId));
      const allCategories = [...defaultCategories, ...userCategories];
      resolvedCategoryId = guessCategory(pattern.merchantName, allCategories) ?? undefined;
    }

    // Calculate next renewal date from most recent charge
    const chargeDates = (pattern.chargeDates as string[]).map((d: string) => new Date(d));
    const mostRecentCharge = chargeDates[chargeDates.length - 1];
    const resolvedFrequency = frequency ?? pattern.detectedFrequency ?? "monthly";
    const nextRenewalDate =
      resolvedFrequency === "yearly"
        ? addYears(mostRecentCharge, 1)
        : addMonths(mostRecentCharge, 1);

    // Calculate normalized monthly amount
    const resolvedAmount = amount ?? parseFloat(pattern.avgAmount);
    const normalizedMonthlyAmount =
      resolvedFrequency === "yearly" ? resolvedAmount / 12 : resolvedAmount;

    // Create subscription
    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        name: name ?? pattern.merchantName,
        amount: resolvedAmount.toFixed(2),
        currency: pattern.currency,
        frequency: resolvedFrequency,
        normalizedMonthlyAmount: normalizedMonthlyAmount.toFixed(2),
        nextRenewalDate,
        lastRenewalDate: mostRecentCharge,
        categoryId: resolvedCategoryId,
        status: "active",
      })
      .returning();

    // Mark pattern as accepted
    await db
      .update(recurringPatterns)
      .set({
        acceptedAt: new Date(),
        createdSubscriptionId: newSubscription.id,
        updatedAt: new Date(),
      })
      .where(eq(recurringPatterns.id, patternId));

    return NextResponse.json({
      success: true,
      subscription: newSubscription,
      patternId,
    });
  } catch (error) {
    console.error("Accept pattern error:", error);
    return NextResponse.json(
      { error: "Failed to accept pattern" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/patterns/accept
 * Undo pattern acceptance (within time window).
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const parsed = undoAcceptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { patternId } = parsed.data;

    // Get pattern and verify ownership
    const [pattern] = await db
      .select()
      .from(recurringPatterns)
      .where(
        and(
          eq(recurringPatterns.id, patternId),
          eq(recurringPatterns.userId, userId)
        )
      )
      .limit(1);

    if (!pattern) {
      return NextResponse.json(
        { error: "Pattern not found" },
        { status: 404 }
      );
    }

    if (!pattern.acceptedAt || !pattern.createdSubscriptionId) {
      return NextResponse.json(
        { error: "Pattern was not accepted" },
        { status: 400 }
      );
    }

    // Delete the created subscription
    await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.id, pattern.createdSubscriptionId),
          eq(subscriptions.userId, userId)
        )
      );

    // Reset pattern state
    await db
      .update(recurringPatterns)
      .set({
        acceptedAt: null,
        createdSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(recurringPatterns.id, patternId));

    return NextResponse.json({
      success: true,
      patternId,
    });
  } catch (error) {
    console.error("Undo accept error:", error);
    return NextResponse.json(
      { error: "Failed to undo acceptance" },
      { status: 500 }
    );
  }
}
