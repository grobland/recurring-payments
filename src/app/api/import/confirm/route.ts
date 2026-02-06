import { NextResponse } from "next/server";
import { subMonths, subYears } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, importAudits } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { confirmImportSchema } from "@/lib/validations/import";
import { calculateNormalizedMonthly } from "@/lib/utils/normalize";
import { isUserActive } from "@/lib/auth/helpers";

/**
 * Trigger pattern detection in the background after import completes.
 * Uses internal fetch to call the detection endpoint with the user's session.
 */
async function triggerPatternDetection(request: Request): Promise<void> {
  try {
    // Get the base URL from the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Forward cookies for authentication
    const cookies = request.headers.get("cookie") || "";

    // Fire and forget - don't await the response
    fetch(`${baseUrl}/api/patterns/detect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookies,
      },
      body: JSON.stringify({ monthsBack: 12 }),
    }).catch((error) => {
      // Log but don't fail the import
      console.error("Background pattern detection failed:", error);
    });
  } catch (error) {
    console.error("Failed to trigger pattern detection:", error);
  }
}

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

    const { subscriptions: toImport, statementSource, rawExtractionData } = result.data;

    // Create audit record FIRST to get the ID for linking subscriptions
    const [audit] = await db
      .insert(importAudits)
      .values({
        userId: session.user.id,
        statementSource,
        fileCount: 1, // We don't track this precisely in this flow
        totalPageCount: rawExtractionData?.pageCount ?? 1,
        detectedCount: toImport.length,
        confirmedCount: 0, // Will update after processing
        rejectedCount: 0,
        mergedCount: 0,
        rawExtractionData, // Persist raw AI response
      })
      .returning();

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
        // Verify the target subscription exists AND belongs to the user
        const [existing] = await db
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.id, sub.mergeWithId),
              eq(subscriptions.userId, session.user.id)
            )
          )
          .limit(1);

        if (!existing) {
          // Skip if subscription doesn't exist or belongs to another user
          skippedCount++;
          continue;
        }

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
            importAuditId: audit.id, // Link merged subscription to this audit
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.mergeWithId));
        mergedCount++;
        continue;
      }

      // Create new subscription linked to audit
      // Calculate lastRenewalDate (transaction date) from nextRenewalDate
      const lastRenewalDate =
        sub.frequency === "yearly"
          ? subYears(sub.nextRenewalDate, 1)
          : subMonths(sub.nextRenewalDate, 1);

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
          lastRenewalDate, // Store transaction date for pattern detection
          normalizedMonthlyAmount: calculateNormalizedMonthly(
            sub.amount,
            sub.frequency
          ),
          status: "active",
          reminderEnabled: true,
          reminderDaysBefore: [7, 1],
          importAuditId: audit.id, // Link to audit record
        })
        .returning();

      createdSubscriptions.push(created);
      createdCount++;
    }

    // Update audit record with final counts
    await db
      .update(importAudits)
      .set({
        confirmedCount: createdCount,
        rejectedCount: skippedCount,
        mergedCount,
        completedAt: new Date(),
      })
      .where(eq(importAudits.id, audit.id));

    // Trigger pattern detection in background after successful import
    // This re-evaluates patterns with the newly imported data
    triggerPatternDetection(request);

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
