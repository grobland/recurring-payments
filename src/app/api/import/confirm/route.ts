import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, importAudits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { confirmImportSchema } from "@/lib/validations/import";
import { calculateNormalizedMonthly } from "@/lib/utils/normalize";
import { isUserActive } from "@/lib/auth/helpers";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can import
    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to import subscriptions." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const result = confirmImportSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { subscriptions: toImport } = result.data;

    let createdCount = 0;
    let skippedCount = 0;
    let mergedCount = 0;
    const createdSubscriptions: typeof subscriptions.$inferSelect[] = [];

    for (const sub of toImport) {
      if (sub.action === "skip") {
        skippedCount++;
        continue;
      }

      if (sub.action === "merge" && sub.mergeWithId) {
        // Update the existing subscription with new data
        await db
          .update(subscriptions)
          .set({
            amount: sub.amount.toFixed(2),
            currency: sub.currency,
            frequency: sub.frequency,
            nextRenewalDate: sub.nextRenewalDate,
            normalizedMonthlyAmount: calculateNormalizedMonthly(
              sub.amount,
              sub.frequency
            ),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.mergeWithId));
        mergedCount++;
        continue;
      }

      // Create new subscription
      const [created] = await db
        .insert(subscriptions)
        .values({
          userId: session.user.id,
          name: sub.name,
          amount: sub.amount.toFixed(2),
          currency: sub.currency,
          frequency: sub.frequency,
          categoryId: sub.categoryId,
          nextRenewalDate: sub.nextRenewalDate,
          normalizedMonthlyAmount: calculateNormalizedMonthly(
            sub.amount,
            sub.frequency
          ),
          status: "active",
          reminderEnabled: true,
          reminderDaysBefore: [7, 1],
        })
        .returning();

      createdSubscriptions.push(created);
      createdCount++;
    }

    // Create audit record
    await db.insert(importAudits).values({
      userId: session.user.id,
      fileCount: 1, // We don't track this precisely in this flow
      totalPageCount: 1,
      detectedCount: toImport.length,
      confirmedCount: createdCount,
      rejectedCount: skippedCount,
      mergedCount,
      completedAt: new Date(),
    });

    return NextResponse.json({
      created: createdCount,
      skipped: skippedCount,
      merged: mergedCount,
      subscriptions: createdSubscriptions,
    });
  } catch (error) {
    console.error("Confirm import error:", error);
    return NextResponse.json(
      { error: "Failed to import subscriptions. Please try again." },
      { status: 500 }
    );
  }
}
