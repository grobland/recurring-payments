import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  transactions,
  subscriptions,
  categories,
  type Transaction,
  type Subscription,
} from "@/lib/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { guessCategory } from "@/lib/utils/category-guesser";
import { addMonths } from "date-fns";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/transactions/[id]/convert
 * Convert a transaction to a subscription.
 * Creates a new subscription pre-filled with transaction data.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Fetch transaction with user ownership check
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Check if already converted
    if (transaction.convertedToSubscriptionId) {
      return NextResponse.json(
        { error: "Transaction already converted" },
        { status: 400 }
      );
    }

    // Fetch categories for category guessing
    const userCategories = await db
      .select()
      .from(categories)
      .where(or(eq(categories.userId, userId), isNull(categories.userId)));

    // Try to guess category from merchant name or AI category guess
    let categoryId: string | null = null;

    // First try guessing from merchant name
    categoryId = guessCategory(transaction.merchantName, userCategories);

    // If no match, try using AI's category guess
    if (!categoryId && transaction.categoryGuess) {
      const lowerGuess = transaction.categoryGuess.toLowerCase();

      // Try exact match on name or slug
      const exactMatch = userCategories.find(
        (cat) =>
          cat.name.toLowerCase() === lowerGuess ||
          cat.slug.toLowerCase() === lowerGuess
      );
      if (exactMatch) {
        categoryId = exactMatch.id;
      } else {
        // Try partial match
        const partialMatch = userCategories.find(
          (cat) =>
            cat.name.toLowerCase().includes(lowerGuess) ||
            lowerGuess.includes(cat.name.toLowerCase())
        );
        if (partialMatch) {
          categoryId = partialMatch.id;
        }
      }
    }

    // Calculate next renewal date: 1 month from transaction date
    const nextRenewalDate = addMonths(new Date(transaction.transactionDate), 1);

    // Calculate normalized monthly amount (assuming monthly frequency)
    const amount = parseFloat(transaction.amount);
    const normalizedMonthlyAmount = amount; // monthly = same value

    // Use transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Create subscription
      const [newSubscription] = await tx
        .insert(subscriptions)
        .values({
          userId,
          name: transaction.merchantName,
          amount: transaction.amount,
          currency: transaction.currency,
          frequency: "monthly",
          normalizedMonthlyAmount: normalizedMonthlyAmount.toFixed(2),
          nextRenewalDate,
          categoryId,
          status: "active",
          reminderEnabled: true,
        })
        .returning();

      // Update transaction
      const [updatedTransaction] = await tx
        .update(transactions)
        .set({
          convertedToSubscriptionId: newSubscription.id,
          tagStatus: "converted",
        })
        .where(eq(transactions.id, id))
        .returning();

      return { subscription: newSubscription, transaction: updatedTransaction };
    });

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("Convert transaction error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/transactions/[id]/convert
 * Undo a transaction conversion.
 * Unlinks the transaction and deletes the created subscription.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Fetch transaction with user ownership check
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Check if not converted
    if (!transaction.convertedToSubscriptionId) {
      return NextResponse.json(
        { error: "Transaction not converted" },
        { status: 400 }
      );
    }

    const subscriptionId = transaction.convertedToSubscriptionId;

    // Use transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // Update transaction first (before deleting subscription)
      const [updatedTransaction] = await tx
        .update(transactions)
        .set({
          convertedToSubscriptionId: null,
          tagStatus: "unreviewed",
        })
        .where(eq(transactions.id, id))
        .returning();

      // Delete the subscription
      await tx
        .delete(subscriptions)
        .where(eq(subscriptions.id, subscriptionId));

      return { transaction: updatedTransaction };
    });

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("Undo conversion error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
