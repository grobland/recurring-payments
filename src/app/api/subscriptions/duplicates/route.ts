import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  calculateSimilarity,
  type SubscriptionRecord,
} from "@/lib/utils/similarity";

/**
 * Duplicate pair returned from scan
 */
export interface DuplicatePair {
  sub1: {
    id: string;
    name: string;
    amount: string;
    currency: string;
    frequency: "monthly" | "yearly";
    categoryId: string | null;
    createdAt: Date;
  };
  sub2: {
    id: string;
    name: string;
    amount: string;
    currency: string;
    frequency: "monthly" | "yearly";
    categoryId: string | null;
    createdAt: Date;
  };
  score: number;
  matches: Record<string, boolean>;
}

// Minimum similarity score to consider as potential duplicate
const DUPLICATE_THRESHOLD = 70;

/**
 * POST /api/subscriptions/duplicates
 * Scan user's subscriptions for potential duplicates
 */
export async function POST() {
  const startTime = performance.now();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all active subscriptions (not deleted, not merged)
    const userSubscriptions = await db
      .select({
        id: subscriptions.id,
        name: subscriptions.name,
        amount: subscriptions.amount,
        currency: subscriptions.currency,
        frequency: subscriptions.frequency,
        categoryId: subscriptions.categoryId,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, session.user.id),
          eq(subscriptions.status, "active"),
          isNull(subscriptions.deletedAt),
          isNull(subscriptions.mergedAt)
        )
      );

    const duplicates: DuplicatePair[] = [];

    // O(n^2) pairwise comparison
    for (let i = 0; i < userSubscriptions.length; i++) {
      for (let j = i + 1; j < userSubscriptions.length; j++) {
        const sub1 = userSubscriptions[i];
        const sub2 = userSubscriptions[j];

        // Convert to SubscriptionRecord for comparison
        const record1: SubscriptionRecord = {
          name: sub1.name,
          amount: parseFloat(sub1.amount),
          currency: sub1.currency,
          frequency: sub1.frequency,
          categoryId: sub1.categoryId,
        };

        const record2: SubscriptionRecord = {
          name: sub2.name,
          amount: parseFloat(sub2.amount),
          currency: sub2.currency,
          frequency: sub2.frequency,
          categoryId: sub2.categoryId,
        };

        const result = calculateSimilarity(record1, record2);

        if (result.score >= DUPLICATE_THRESHOLD) {
          duplicates.push({
            sub1: {
              id: sub1.id,
              name: sub1.name,
              amount: sub1.amount,
              currency: sub1.currency,
              frequency: sub1.frequency,
              categoryId: sub1.categoryId,
              createdAt: sub1.createdAt,
            },
            sub2: {
              id: sub2.id,
              name: sub2.name,
              amount: sub2.amount,
              currency: sub2.currency,
              frequency: sub2.frequency,
              categoryId: sub2.categoryId,
              createdAt: sub2.createdAt,
            },
            score: result.score,
            matches: result.matches,
          });
        }
      }
    }

    // Sort by score descending
    duplicates.sort((a, b) => b.score - a.score);

    const duration = Math.round(performance.now() - startTime);
    console.log(
      `Duplicate scan: ${userSubscriptions.length} subscriptions, ${duplicates.length} pairs found in ${duration}ms`
    );

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error("Duplicate scan error:", error);
    return NextResponse.json(
      { error: "An error occurred during duplicate scan" },
      { status: 500 }
    );
  }
}
